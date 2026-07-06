import { useState } from 'react';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import { Panel } from '../../components/Card.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { LoadingRetry } from '../../components/LoadingSpinner.jsx';
import api from '../../api/client.js';
import { money, shortDate, stripCommas, formatAmountInput } from '../../utils/format.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDelayedAsync } from '../../hooks/useDelayedAsync.js';

export default function RecordSavings() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ member_id: '', amount: '', transaction_date: new Date().toISOString().slice(0, 10), notes: '' });
  const [showConfirm, setShowConfirm] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  async function loadMembers() {
    const { data } = await api.get('/members?limit=100');
    setMembers(data.data);
  }

  const { loading, error: loadError, onRetry } = useDelayedAsync(loadMembers, [], {
    errorMessage: 'Failed to load members',
  });

  function requestSubmit(event) {
    event.preventDefault();
    setError('');
    setShowConfirm(true);
  }

  async function confirmSubmit() {
    const cleanForm = { ...form, amount: stripCommas(form.amount) };
    setError('');
    try {
      await api.post('/savings', cleanForm);
      const selectedMember = members.find((m) => m.id === form.member_id);
      setReceiptData({
        memberName: selectedMember?.full_name || '-',
        memberNumber: selectedMember?.member_number || '-',
        amount: cleanForm.amount,
        date: form.transaction_date,
        treasurerName: user?.full_name || '-',
      });
      setMessage('Savings recorded successfully');
      setForm((current) => ({ ...current, amount: '', notes: '', member_id: '' }));
      setShowConfirm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record savings');
      setShowConfirm(false);
    }
  }

  function resetForm() {
    setReceiptData(null);
    setMessage('');
    setError('');
  }

  const selectedMember = members.find((m) => m.id === form.member_id);

  return (
    <div className="page-stack">
      <h1>Record Savings</h1>

      {receiptData ? (
        <Panel title="Savings Receipt">
          <div className="receipt">
            <h3>Bodax SACCO</h3>
            <p className="text-muted">Savings receipt</p>
            <div className="receipt-body">
              <div className="receipt-row">
                <span>Member name</span>
                <span>{receiptData.memberName}</span>
              </div>
              <div className="receipt-row">
                <span>Member number</span>
                <span>{receiptData.memberNumber}</span>
              </div>
              <div className="receipt-row">
                <span>Amount</span>
                <span>{money(receiptData.amount)}</span>
              </div>
              <div className="receipt-row">
                <span>Date</span>
                <span>{shortDate(receiptData.date)}</span>
              </div>
              <div className="receipt-row">
                <span>Treasurer</span>
                <span>{receiptData.treasurerName}</span>
              </div>
            </div>
            <div className="receipt-actions">
              <Button onClick={resetForm}>Record another saving</Button>
            </div>
          </div>
        </Panel>
      ) : (
        <Panel title="New savings transaction">
          <LoadingRetry loading={loading} error={loadError} onRetry={onRetry}>
            {message && <p className="success">{message}</p>}
            {error && <p className="alert">{error}</p>}
            <form className="form-grid" onSubmit={requestSubmit}>
              <label className="field">
                <span>Member</span>
                <select value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })} required>
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
              <FormField label="Date" type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
              <FormField label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <Button>Record savings</Button>
            </form>
          </LoadingRetry>
        </Panel>
      )}

      <ConfirmModal
        open={showConfirm}
        title="Confirm Record Savings"
        onConfirm={confirmSubmit}
        onCancel={() => setShowConfirm(false)}
      >
        <dl className="details">
          <dt>Member name</dt>
          <dd>{selectedMember?.full_name || '-'}</dd>
          <dt>Member number</dt>
          <dd>{selectedMember?.member_number || '-'}</dd>
          <dt>Amount</dt>
          <dd>{money(stripCommas(form.amount) || 0)}</dd>
          <dt>Date</dt>
          <dd>{shortDate(form.transaction_date)}</dd>
          <dt>Treasurer</dt>
          <dd>{user?.full_name || '-'}</dd>
        </dl>
      </ConfirmModal>
    </div>
  );
}