import { useEffect, useState } from 'react';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import { Panel } from '../../components/Card.jsx';
import api from '../../api/client.js';
import { money } from '../../utils/format.js';

const MIN_DATE = '2020-01-01';
const MAX_DATE = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

function isValidTransactionDate(value) {
  if (!value) return false;
  if (value < MIN_DATE) return 'Date cannot be before January 2020';
  if (value > MAX_DATE) return 'Date cannot be more than a year in the future';
  return null;
}

export default function RecordSavings() {
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedMemberSummary, setSelectedMemberSummary] = useState(null);
  const [form, setForm] = useState({ member_id: '', amount: '', transaction_date: new Date().toISOString().slice(0, 10), notes: '' });

  useEffect(() => {
    api.get('/members?limit=100')
      .then(({ data }) => setMembers(data.data))
      .catch(() => setError('Failed to load member list'));
  }, []);

  async function loadMemberSummary(memberId) {
    if (!memberId) {
      setSelectedMemberSummary(null);
      return;
    }
    try {
      const { data } = await api.get(`/savings/members/${memberId}/summary`);
      setSelectedMemberSummary(data);
    } catch {
      setSelectedMemberSummary(null);
    }
  }

  function handleMemberChange(e) {
    const memberId = e.target.value;
    setForm((current) => ({ ...current, member_id: memberId }));
    if (memberId) loadMemberSummary(memberId);
    else setSelectedMemberSummary(null);
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!form.member_id?.trim()) {
      setError('Please select a member');
      return;
    }

    const amount = Number(form.amount);
    if (!amount || amount < 1) {
      setError('Amount must be at least 1 UGX');
      return;
    }

    const dateError = isValidTransactionDate(form.transaction_date);
    if (dateError) {
      setError(dateError);
      return;
    }

    try {
      await api.post('/savings', {
        member_id: form.member_id.trim(),
        amount,
        transaction_date: form.transaction_date,
        notes: form.notes.trim() || undefined,
      });
      setMessage('Savings recorded successfully');
      setForm((current) => ({ ...current, amount: '', notes: '' }));
      if (form.member_id) loadMemberSummary(form.member_id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record savings');
    }
  }

  return (
    <div className="page-stack">
      <h1>Record Savings</h1>
      <Panel title="New savings transaction">
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
        <form className="form-grid" onSubmit={submit}>
          <label className="field">
            <span>Member</span>
            <select value={form.member_id} onChange={handleMemberChange} required>
              <option value="">Select member</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name} - {member.member_number}
                </option>
              ))}
            </select>
            {selectedMemberSummary && (
              <small>Savings balance: <strong>{money(selectedMemberSummary.total_savings)}</strong></small>
            )}
          </label>
          <FormField label="Amount (UGX)" type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          <FormField label="Date" type="date" min={MIN_DATE} max={MAX_DATE} value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} required />
          <FormField label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength="500" />
          <Button>Record savings</Button>
        </form>
      </Panel>
    </div>
  );
}