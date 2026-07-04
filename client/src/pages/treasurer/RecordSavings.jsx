import { useEffect, useState } from 'react';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import { Panel } from '../../components/Card.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import api from '../../api/client.js';
import { money } from '../../utils/format.js';

export default function RecordSavings() {
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ member_id: '', amount: '', transaction_date: new Date().toISOString().slice(0, 10), notes: '' });
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    api.get('/members?limit=100').then(({ data }) => setMembers(data.data));
  }, []);

  function requestSubmit(event) {
    event.preventDefault();
    setShowConfirm(true);
  }

  async function confirmSubmit() {
    await api.post('/savings', form);
    setMessage('Savings recorded successfully');
    setForm((current) => ({ ...current, amount: '', notes: '', member_id: '' }));
    setShowConfirm(false);
  }

  const selectedMember = members.find((m) => m.id === form.member_id);

  return (
    <div className="page-stack">
      <h1>Record Savings</h1>
      <Panel title="New savings transaction">
        {message && <p className="success">{message}</p>}
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
          <FormField label="Amount (UGX)" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          <FormField label="Date" type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
          <FormField label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button>Record savings</Button>
        </form>
      </Panel>

      <ConfirmModal
        open={showConfirm}
        title="Confirm Record Savings"
        onConfirm={confirmSubmit}
        onCancel={() => setShowConfirm(false)}
      >
        <p>You are about to <strong>record savings</strong>.</p>
        <p><strong>Member:</strong> {selectedMember?.full_name} ({selectedMember?.member_number})</p>
        <p><strong>Amount:</strong> {money(form.amount)}</p>
      </ConfirmModal>
    </div>
  );
}
