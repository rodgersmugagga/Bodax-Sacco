import { useState } from 'react';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import { Panel } from '../../components/Card.jsx';
import { LoadingRetry } from '../../components/LoadingSpinner.jsx';
import api from '../../api/client.js';
import { formatAmountInput, stripCommas } from '../../utils/format.js';
import { useDelayedAsync } from '../../hooks/useDelayedAsync.js';

export default function ConfirmDeposits() {
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [receiptConfirmed, setReceiptConfirmed] = useState(true);
  const [form, setForm] = useState({
    member_id: '',
    amount: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  async function loadMembers() {
    const { data } = await api.get('/members?limit=100');
    setMembers(data.data);
  }

  const { loading, error: loadError, onRetry } = useDelayedAsync(loadMembers, [], {
    errorMessage: 'Failed to load members',
  });

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      await api.post('/savings', { ...form, amount: stripCommas(form.amount), confirmed: receiptConfirmed });
      setMessage('Savings deposit confirmed and recorded successfully.');
      setForm({
        member_id: '',
        amount: '',
        transaction_date: new Date().toISOString().slice(0, 10),
        notes: '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to confirm deposit');
    }
  }

  return (
    <div className="page-stack">
      <h1>Confirm Savings Deposit</h1>
      <Panel title="Confirm savings receipt">
        <LoadingRetry loading={loading} error={loadError} onRetry={onRetry}>
          {message && <p className="success">{message}</p>}
          {error && <p className="alert">{error}</p>}
          <form className="form-grid" onSubmit={submit}>
            <label className="field">
              <span>Member</span>
              <select
                value={form.member_id}
                onChange={(e) => setForm({ ...form, member_id: e.target.value })}
                required
              >
                <option value="">Select member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} - {member.member_number}
                  </option>
                ))}
              </select>
            </label>
            <FormField
              label="Amount Saved (UGX)"
              type="text"
              inputMode="numeric"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: formatAmountInput(e.target.value) })}
              required
            />
            <FormField
              label="Date"
              type="date"
              value={form.transaction_date}
              onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
              required
            />
            <FormField
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <label className="field checkbox-field">
              <input
                type="checkbox"
                checked={receiptConfirmed}
                onChange={(e) => setReceiptConfirmed(e.target.checked)}
              />
              <span>Send SMS confirmation to the member</span>
            </label>
            <Button>Confirm deposit</Button>
          </form>
        </LoadingRetry>
      </Panel>
    </div>
  );
}