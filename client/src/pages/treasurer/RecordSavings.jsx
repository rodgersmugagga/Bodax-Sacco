import { useEffect, useState } from 'react';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import { Panel } from '../../components/Card.jsx';
import api from '../../api/client.js';

export default function RecordSavings() {
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ member_id: '', amount: '', transaction_date: new Date().toISOString().slice(0, 10), notes: '' });

  useEffect(() => {
    api.get('/members?limit=100').then(({ data }) => setMembers(data.data));
  }, []);

  async function submit(event) {
    event.preventDefault();
    await api.post('/savings', form);
    setMessage('Savings recorded successfully');
    setForm((current) => ({ ...current, amount: '', notes: '', member_id: '' }));
  }

  return (
    <div className="page-stack">
      <h1>Record Savings</h1>
      <Panel title="New savings transaction">
        {message && <p className="success">{message}</p>}
        <form className="form-grid" onSubmit={submit}>
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
          <FormField label="Amount (UGX)" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          <FormField label="Date" type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
          <FormField label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button>Record savings</Button>
        </form>
      </Panel>
    </div>
  );
}
