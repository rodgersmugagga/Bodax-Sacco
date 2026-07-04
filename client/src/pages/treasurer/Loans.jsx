import { useEffect, useState } from 'react';
import Button from '../../components/Button.jsx';
import DataTable from '../../components/DataTable.jsx';
import FormField from '../../components/FormField.jsx';
import { Panel } from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import api from '../../api/client.js';
import { money, shortDate } from '../../utils/format.js';

export default function TreasurerLoans() {
  const [members, setMembers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loanForm, setLoanForm] = useState({ member_id: '', principal: '', interest_rate: 10, installment_count: 4, due_date: '' });
  const [repayment, setRepayment] = useState({ loan_id: '', amount: '' });
  
  const [showConfirmIssue, setShowConfirmIssue] = useState(false);
  const [showConfirmRepay, setShowConfirmRepay] = useState(false);

  async function load() {
    const [memberResult, loanResult] = await Promise.all([api.get('/members?limit=100'), api.get('/loans')]);
    setMembers(memberResult.data.data);
    setLoans(loanResult.data);
  }

  useEffect(() => {
    load();
  }, []);

  function requestIssue(event) {
    event.preventDefault();
    setShowConfirmIssue(true);
  }

  async function confirmIssue() {
    await api.post('/loans', loanForm);
    setLoanForm({ member_id: '', principal: '', interest_rate: 10, installment_count: 4, due_date: '' });
    setShowConfirmIssue(false);
    load();
  }

  function requestPay(event) {
    event.preventDefault();
    setShowConfirmRepay(true);
  }

  async function confirmPay() {
    await api.post('/loans/repayments', repayment);
    setRepayment({ loan_id: '', amount: '' });
    setShowConfirmRepay(false);
    load();
  }

  const selectedMemberIssue = members.find((m) => m.id === loanForm.member_id);
  const selectedLoan = loans.find((l) => l.id === repayment.loan_id);

  return (
    <div className="page-stack">
      <h1>Loans</h1>
      <Panel title="Issue loan">
        <form className="form-grid" onSubmit={requestIssue}>
          <SelectMember members={members} value={loanForm.member_id} onChange={(value) => setLoanForm({ ...loanForm, member_id: value })} />
          <FormField label="Principal (UGX)" type="number" value={loanForm.principal} onChange={(e) => setLoanForm({ ...loanForm, principal: e.target.value })} required />
          <FormField label="Interest %" type="number" value={loanForm.interest_rate} onChange={(e) => setLoanForm({ ...loanForm, interest_rate: e.target.value })} />
          <FormField label="Installments" type="number" value={loanForm.installment_count} onChange={(e) => setLoanForm({ ...loanForm, installment_count: e.target.value })} />
          <FormField label="Due date" type="date" value={loanForm.due_date} onChange={(e) => setLoanForm({ ...loanForm, due_date: e.target.value })} required />
          <Button>Issue loan</Button>
        </form>
      </Panel>
      <Panel title="Record repayment">
        <form className="form-grid" onSubmit={requestPay}>
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
          <FormField label="Amount (UGX)" type="number" value={repayment.amount} onChange={(e) => setRepayment({ ...repayment, amount: e.target.value })} required />
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

      <ConfirmModal
        open={showConfirmIssue}
        title="Confirm Issue Loan"
        onConfirm={confirmIssue}
        onCancel={() => setShowConfirmIssue(false)}
      >
        <p>You are about to <strong>issue loan</strong>.</p>
        <p><strong>Member:</strong> {selectedMemberIssue?.full_name} ({selectedMemberIssue?.member_number})</p>
        <p><strong>Amount:</strong> {money(loanForm.principal)}</p>
      </ConfirmModal>

      <ConfirmModal
        open={showConfirmRepay}
        title="Confirm Record Repayment"
        onConfirm={confirmPay}
        onCancel={() => setShowConfirmRepay(false)}
      >
        <p>You are about to <strong>record repayment</strong>.</p>
        <p><strong>Member:</strong> {selectedLoan?.full_name}</p>
        <p><strong>Amount:</strong> {money(repayment.amount)}</p>
      </ConfirmModal>
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
