import { useEffect, useMemo, useState } from 'react';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import { Panel } from '../../components/Card.jsx';
import api from '../../api/client.js';

export default function ConfirmDeposits() {
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ 
    member_id: '', 
    amount: '', 
    transaction_date: new Date().toISOString().slice(0, 10), 
    notes: '' 
  });

  useEffect(() => {
    api.get('/members?limit=100').then(({ data }) => setMembers(data.data));
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    const amount = Number(form.amount);
    if (!amount || amount < 1) {
      setError('Amount must be at least 1 UGX');
      return;
    }
    if (!form.member_id?.trim()) {
      setError('Please select a member');
      return;
    }

    try {
      await api.post('/savings', {
        member_id: form.member_id.trim(),
        amount,
        transaction_date: form.transaction_date || undefined,
        notes: form.notes.trim() || undefined,
      });
      setMessage('Savings deposit confirmed and recorded successfully.');
      setForm({ 
        member_id: '', 
        amount: '', 
        transaction_date: new Date().toISOString().slice(0, 10), 
        notes: '' 
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to confirm deposit');
    }
  }

  return (
    <div className="page-stack">
      <h1>Confirm Savings Deposit</h1>
      <Panel title="Confirm savings receipt">
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
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
            label="Amount (UGX)"
            type="number"
            min="1"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
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
            maxLength="500"
          />
          <Button>Confirm deposit</Button>
        </form>
      </Panel>
    </div>
  );
}