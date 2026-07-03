import { useState } from 'react';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import { Panel } from '../../components/Card.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import api from '../../api/client.js';
import { money, stripCommas } from '../../utils/format.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function WithdrawRequest() {
  const { user } = useAuth();
  const [form, setForm] = useState({ amount: '', reason: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setShowConfirm(true);
  }

  async function confirmRequest() {
    setShowConfirm(false);
    setMessage('');
    setError('');
    try {
      const cleanAmount = stripCommas(form.amount);
      await api.post('/withdrawals/requests', { amount: cleanAmount, reason: form.reason });
      setMessage('Withdrawal request submitted successfully. Awaiting treasurer approval.');
      setForm({ amount: '', reason: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit withdrawal request');
    }
  }

  return (
    <div className="page-stack">
      <h1>Withdrawal Request</h1>
      <Panel title="Request a withdrawal">
        {message && <p className="success">{message}</p>}
        {error && <p className="alert">{error}</p>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <FormField
            label="Amount (UGX)"
            type="text"
            inputMode="numeric"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
          <FormField
            label="Reason"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
          <Button>Submit withdrawal request</Button>
        </form>
      </Panel>

      <ConfirmModal
        open={showConfirm}
        title="Confirm Withdrawal Request"
        confirmLabel="Submit Request"
        onConfirm={confirmRequest}
        onCancel={() => setShowConfirm(false)}
      >
        <dl className="details">
          <dt>Member Name</dt>
          <dd>{user?.full_name || '-'}</dd>
          <dt>Member Number</dt>
          <dd>{user?.member_number || '-'}</dd>
          <dt>Requested Amount</dt>
          <dd>{money(stripCommas(form.amount) || 0)}</dd>
        </dl>
      </ConfirmModal>
    </div>
  );
}
