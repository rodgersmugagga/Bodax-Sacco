import { useEffect, useState } from 'react';
import Button from '../../components/Button.jsx';
import DataTable from '../../components/DataTable.jsx';
import FormField from '../../components/FormField.jsx';
import { Panel } from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import api from '../../api/client.js';
import { money, shortDate } from '../../utils/format.js';

export default function TreasurerLoans() {
  const [members, setMembers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [error, setError] = useState('');
  const [loanForm, setLoanForm] = useState({ member_id: '', principal: '', interest_rate: 10, installment_count: 4, due_date: '' });
  const [repayment, setRepayment] = useState({ loan_id: '', amount: '' });

  async function load() {
    try {
      const [memberResult, loanResult] = await Promise.all([api.get('/members?limit=100'), api.get('/loans')]);
      setMembers(memberResult.data.data);
      setLoans(loanResult.data);
    } catch (err) {
      setError('Failed to load data');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function issue(event) {
    event.preventDefault();
    setError('');

    const principal = Number(loanForm.principal);
    if (!principal || principal < 1) {
      setError('Principal must be at least 1 UGX');
      return;
    }
    if (!loanForm.member_id) {
      setError('Please select a member');
      return;
    }
    if (!loanForm.due_date) {
      setError('Due date is required');
      return;
    }
    if (new Date(loanForm.due_date) <= new Date(new Date().toDateString())) {
      setError('Due date must be in the future');
      return;
    }

    if (!window.confirm(
      `Issue a loan of ${Number(principal).toLocaleString()} UGX to this member?\n\nInterest: ${loanForm.interest_rate}%\nInstallments: ${loanForm.installment_count}\nDue: ${loanForm.due_date}`
    )) return;

    try {
      await api.post('/loans', {
        member_id: loanForm.member_id,
        principal,
        interest_rate: Number(loanForm.interest_rate) || 10,
        installment_count: Number(loanForm.installment_count) || 4,
        due_date: loanForm.due_date,
      });
      setLoanForm({ member_id: '', principal: '', interest_rate: 10, installment_count: 4, due_date: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to issue loan');
    }
  }

  async function pay(event) {
    event.preventDefault();
    setError('');

    const amount = Number(repayment.amount);
    if (!amount || amount < 1) {
      setError('Repayment amount must be at least 1 UGX');
      return;
    }
    if (!repayment.loan_id) {
      setError('Please select a loan');
      return;
    }

    try {
      await api.post('/loans/repayments', { loan_id: repayment.loan_id, amount });
      setRepayment({ loan_id: '', amount: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record repayment');
    }
  }

  return (
    <div className="page-stack">
      <h1>Loans</h1>
      {error && <p className="error">{error}</p>}
      <Panel title="Issue loan">
        <form className="form-grid" onSubmit={issue}>
          <SelectMember members={members} value={loanForm.member_id} onChange={(value) => setLoanForm({ ...loanForm, member_id: value })} />
          <FormField label="Principal (UGX)" type="number" min="1" value={loanForm.principal} onChange={(e) => setLoanForm({ ...loanForm, principal: e.target.value })} required />
          <FormField label="Interest %" type="number" min="0" max="100" value={loanForm.interest_rate} onChange={(e) => setLoanForm({ ...loanForm, interest_rate: e.target.value })} />
          <FormField label="Installments" type="number" min="1" max="60" value={loanForm.installment_count} onChange={(e) => setLoanForm({ ...loanForm, installment_count: e.target.value })} />
          <FormField label="Due date" type="date" value={loanForm.due_date} onChange={(e) => setLoanForm({ ...loanForm, due_date: e.target.value })} required />
          <Button>Issue loan</Button>
        </form>
      </Panel>
      <Panel title="Record repayment">
        <form className="form-grid" onSubmit={pay}>
          <label className="field">
            <span>Loan</span>
            <select value={repayment.loan_id} onChange={(e) => setRepayment({ ...repayment, loan_id: e.target.value })} required>
              <option value="">Select loan</option>
              {loans.filter((loan) => loan.status !== 'completed').map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {loan.full_name} - balance {money(loan.remaining_balance)}
                </option>
              ))}
            </select>
          </label>
          <FormField label="Amount (UGX)" type="number" min="1" value={repayment.amount} onChange={(e) => setRepayment({ ...repayment, amount: e.target.value })} required />
          <Button>Record repayment</Button>
        </form>
      </Panel>
      <Panel title="Loan book">
        <DataTable
          rows={loans}
          columns={[
            { key: 'full_name', label: 'Member' },
            { key: 'principal', label: 'Principal', render: (row) => money(row.principal) },
            { key: 'remaining_balance', label: 'Balance', render: (row) => money(row.remaining_balance) },
            { key: 'installment_amount', label: 'Installment', render: (row) => money(row.installment_amount) },
            { key: 'due_date', label: 'Due', render: (row) => shortDate(row.due_date) },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
          ]}
        />
      </Panel>
    </div>
  );
}

function SelectMember({ members, value, onChange }) {
  return (
    <label className="field">
      <span>Member</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} required>
        <option value="">Select member</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.full_name} - {member.member_number}
          </option>
        ))}
      </select>
    </label>
  );
}
