import { useEffect, useMemo, useState } from 'react';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import { Panel } from '../../components/Card.jsx';
import api from '../../api/client.js';

export default function ConfirmDeposits() {
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState('');
  const [receiptConfirmed, setReceiptConfirmed] = useState(true);
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
    await api.post('/savings', { ...form, confirmed: receiptConfirmed });
    setMessage('Savings deposit confirmed and recorded successfully.');
    setForm({ 
      member_id: '', 
      amount: '', 
      transaction_date: new Date().toISOString().slice(0, 10), 
      notes: '' 
    });
  }

  return (
    <div className="page-stack">
      <h1>Confirm Savings Deposit</h1>
      <Panel title="Confirm savings receipt">
        {message && <p className="success">{message}</p>}
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
            min="0"
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
      </Panel>
    </div>
  );
}