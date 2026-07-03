import { useEffect, useState } from 'react';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import { Panel } from '../../components/Card.jsx';
import api from '../../api/client.js';
import { requiredField, positiveAmount, notFutureDate, runValidation } from '../../utils/validate.js';

export default function RecordSavings() {
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState('');
  const [apiError, setApiError] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ member_id: '', amount: '', transaction_date: new Date().toISOString().slice(0, 10), notes: '' });

  useEffect(() => {
    api.get('/members?limit=100').then(({ data }) => setMembers(data.data));
  }, []);

  function validate() {
    return runValidation({
      member_id: requiredField(form.member_id, 'Member'),
      amount: positiveAmount(form.amount, 'Amount'),
      transaction_date: notFutureDate(form.transaction_date, 'Transaction date'),
    });
  }

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    setApiError('');

    const { errors: fieldErrors, isValid } = validate();
    setErrors(fieldErrors);
    if (!isValid) return;

    setSubmitting(true);
    try {
      await api.post('/savings', form);
      setMessage('Savings recorded successfully');
      setForm((current) => ({ ...current, amount: '', notes: '', member_id: '' }));
      setErrors({});
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to record savings. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <h1>Record Savings</h1>
      <Panel title="New savings transaction">
        {message && <p className="success">{message}</p>}
        {apiError && <p className="alert">{apiError}</p>}
        <form className="form-grid" onSubmit={submit} noValidate>
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
            label="Amount (UGX)"
            type="number"
            min="1"
            step="1"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
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
          <FormField
            label="Notes"
            maxLength="200"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <Button disabled={submitting}>{submitting ? 'Recording...' : 'Record savings'}</Button>
        </form>
      </Panel>
    </div>
  );
}
