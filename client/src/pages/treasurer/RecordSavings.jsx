import { useEffect, useState } from 'react';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import { Panel } from '../../components/Card.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import api from '../../api/client.js';
import { money, shortDate, stripCommas, formatAmountInput } from '../../utils/format.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function RecordSavings() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ member_id: '', amount: '', transaction_date: new Date().toISOString().slice(0, 10), notes: '' });
  const [showConfirm, setShowConfirm] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  useEffect(() => {
    api.get('/members?limit=100').then(({ data }) => setMembers(data.data));
  }, []);

  function requestSubmit(event) {
    event.preventDefault();
    setShowConfirm(true);
  }

  async function confirmSubmit() {
    const cleanForm = { ...form, amount: stripCommas(form.amount) };
    await api.post('/savings', cleanForm);
    
    const selectedMember = members.find((m) => m.id === form.member_id);
    
    setReceiptData({
      memberName: selectedMember?.full_name,
      memberNumber: selectedMember?.member_number,
      amount: cleanForm.amount,
      date: form.transaction_date,
      treasurerName: user?.full_name
    });
    
    setMessage('Savings recorded successfully');
    setForm((current) => ({ ...current, amount: '', notes: '', member_id: '' }));
    setShowConfirm(false);
  }

  function resetForm() {
    setReceiptData(null);
    setMessage('');
  }

  const selectedMember = members.find((m) => m.id === form.member_id);

  return (
    <div className="page-stack">
      <h1>Record Savings</h1>
      
      {receiptData ? (
        <Panel title="Savings Receipt">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ margin: '0 0 8px 0', color: 'var(--color-primary)' }}>Bodax SACCO</h2>
            <p style={{ margin: '0', color: 'var(--color-muted)' }}>Savings Deposit Receipt</p>
          </div>
          
          <div style={{ background: 'var(--background-color)', padding: '16px', borderRadius: 'var(--radius)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--color-muted)' }}>Member Name:</span>
              <strong>{receiptData.memberName}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--color-muted)' }}>Member Number:</span>
              <strong>{receiptData.memberNumber}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px dashed var(--border-color)' }}>
              <span style={{ color: 'var(--color-muted)' }}>Date:</span>
              <strong>{shortDate(receiptData.date)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '1.2rem' }}>
              <span style={{ color: 'var(--color-muted)' }}>Amount Saved:</span>
              <strong style={{ color: 'var(--color-success)' }}>{money(receiptData.amount)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--color-muted)' }}>Served by:</span>
              <span>{receiptData.treasurerName} (Treasurer)</span>
            </div>
          </div>
          
          <Button onClick={resetForm} style={{ width: '100%' }}>Record Another Deposit</Button>
        </Panel>
      ) : (
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
        </Panel>
      )}

      <ConfirmModal
        open={showConfirm}
        title="Confirm Record Savings"
        onConfirm={confirmSubmit}
        onCancel={() => setShowConfirm(false)}
      >
        <p>You are about to <strong>record savings</strong>.</p>
        <p><strong>Member:</strong> {selectedMember?.full_name} ({selectedMember?.member_number})</p>
        <p><strong>Amount:</strong> {money(stripCommas(form.amount) || 0)}</p>
      </ConfirmModal>
    </div>
  );
}
