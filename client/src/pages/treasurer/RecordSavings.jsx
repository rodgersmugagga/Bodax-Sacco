import { useState } from 'react';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import { Panel } from '../../components/Card.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { LoadingRetry } from '../../components/LoadingSpinner.jsx';
import api from '../../api/client.js';
import { money, shortDate, stripCommas, formatAmountInput } from '../../utils/format.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { requiredField, positiveAmount, notFutureDate, dateRequired, runValidation } from '../../utils/validate.js';
import { useDelayedAsync } from '../../hooks/useDelayedAsync.js';

export default function RecordSavings() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState('');
  const [apiError, setApiError] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
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

  function validate() {
    return runValidation({
      member_id: requiredField(form.member_id, 'Member'),
      amount: positiveAmount(stripCommas(form.amount), 'Amount'),
      transaction_date: dateRequired(form.transaction_date, 'Transaction date') || notFutureDate(form.transaction_date, 'Transaction date'),
    });
  }

  function requestSubmit(event) {
    event.preventDefault();
    setMessage('');
    setApiError('');

    const { errors: fieldErrors, isValid } = validate();
    setErrors(fieldErrors);
    if (!isValid) return;

    setShowConfirm(true);
  }

  async function confirmSubmit() {
    const cleanForm = { ...form, amount: stripCommas(form.amount) };
    setApiError('');
    setSubmitting(true);
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
      setErrors({});
      setShowConfirm(false);
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to record savings. Please try again.');
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setReceiptData(null);
    setMessage('');
    setApiError('');
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
            {apiError && <p className="alert">{apiError}</p>}
            <form className="form-grid" onSubmit={requestSubmit} noValidate>
              <label className={`field${errors.member_id ? ' select-error' : ''}`}>
                <span>Member</span>
                <select value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })} required>
                  <option value="">Select member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name} - {member.member_number}
                    </option>
                  ))}
                </select>
                {errors.member_id && <small className="field-error-msg">{errors.member_id}</small>}
              </label>
              <FormField
                label="Amount Saved (UGX)"
                type="text"
                inputMode="numeric"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: formatAmountInput(e.target.value) })}
                error={errors.amount}
                required
              />
              <FormField
                label="Date"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={form.transaction_date}
                onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
                error={errors.transaction_date}
              />
              <FormField label="Notes" maxLength="200" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <Button disabled={submitting}>{submitting ? 'Recording...' : 'Record savings'}</Button>
            </form>
          </LoadingRetry>
        </Panel>
      )}

      <ConfirmModal
        open={showConfirm}
        title="Confirm Record Savings"
        confirmLabel={submitting ? 'Recording...' : 'Confirm'}
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