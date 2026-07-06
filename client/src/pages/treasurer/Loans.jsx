import { useState } from 'react';
import Button from '../../components/Button.jsx';
import DataTable from '../../components/DataTable.jsx';
import FormField from '../../components/FormField.jsx';
import { Panel } from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { LoadingRetry } from '../../components/LoadingSpinner.jsx';
import api from '../../api/client.js';
import { money, shortDate, stripCommas, formatAmountInput } from '../../utils/format.js';
import { useDelayedAsync } from '../../hooks/useDelayedAsync.js';

export default function TreasurerLoans() {
  const [members, setMembers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loanForm, setLoanForm] = useState({ member_id: '', principal: '', interest_rate: 10, installment_count: 4, due_date: '' });
  const [repayment, setRepayment] = useState({ loan_id: '', amount: '', next_due_date: '' });
  const [actionError, setActionError] = useState('');
  const [showConfirmIssue, setShowConfirmIssue] = useState(false);
  const [showConfirmRepay, setShowConfirmRepay] = useState(false);

  async function load() {
    const [memberResult, loanResult] = await Promise.all([api.get('/members?limit=100'), api.get('/loans')]);
    setMembers(memberResult.data.data);
    setLoans(loanResult.data);
  }

  const { loading, error, onRetry } = useDelayedAsync(load, [], {
    errorMessage: 'Failed to load loan records',
  });

  function requestIssue(event) {
    event.preventDefault();
    setActionError('');
    setShowConfirmIssue(true);
  }

  async function confirmIssue() {
    setActionError('');
    try {
      const cleanForm = { ...loanForm, principal: stripCommas(loanForm.principal) };
      await api.post('/loans', cleanForm);
      setLoanForm({ member_id: '', principal: '', interest_rate: 10, installment_count: 4, due_date: '' });
      setShowConfirmIssue(false);
      onRetry();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to issue loan');
    }
  }

  function requestPay(event) {
    event.preventDefault();
    setActionError('');
    setShowConfirmRepay(true);
  }

  async function confirmPay() {
    setActionError('');
    try {
      const cleanForm = { loan_id: repayment.loan_id, amount: stripCommas(repayment.amount) };
      await api.post('/loans/repayments', cleanForm);
      setRepayment({ loan_id: '', amount: '', next_due_date: '' });
      setShowConfirmRepay(false);
      onRetry();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to record repayment');
    }
  }

  function handleRepaymentLoanSelect(loanId) {
    const loan = loans.find((l) => l.id === loanId);
    if (loan) {
      setRepayment({
        loan_id: loanId,
        amount: formatAmountInput(String(Math.round(Number(loan.remaining_balance || 0)))),
        next_due_date: shortDate(loan.due_date),
      });
    } else {
      setRepayment({ loan_id: loanId, amount: '', next_due_date: '' });
    }
  }

  const selectedMemberIssue = members.find((m) => m.id === loanForm.member_id);
  const selectedLoan = loans.find((l) => l.id === repayment.loan_id);

  return (
    <div className="page-stack">
      <h1>Loans</h1>
      <LoadingRetry loading={loading} error={error} onRetry={onRetry}>
        <>
          {actionError && <p className="alert">{actionError}</p>}
          <Panel title="Issue loan">
            <form className="form-grid" onSubmit={requestIssue}>
              <SelectMember members={members} value={loanForm.member_id} onChange={(value) => setLoanForm({ ...loanForm, member_id: value })} />
              <FormField
                label="Amount borrowed (UGX)"
                type="text"
                inputMode="numeric"
                value={loanForm.principal}
                onChange={(e) => setLoanForm({ ...loanForm, principal: formatAmountInput(e.target.value) })}
                required
              />
              <FormField label="Interest %" type="number" value={loanForm.interest_rate} onChange={(e) => setLoanForm({ ...loanForm, interest_rate: e.target.value })} />
              <FormField label="Number of payments" type="number" value={loanForm.installment_count} onChange={(e) => setLoanForm({ ...loanForm, installment_count: e.target.value })} />
              <FormField label="Due date" type="date" value={loanForm.due_date} onChange={(e) => setLoanForm({ ...loanForm, due_date: e.target.value })} required />
              <Button>Issue loan</Button>
            </form>
          </Panel>

          <Panel title="Record repayment">
            <form className="form-grid" onSubmit={requestPay}>
              <label className="field">
                <span>Loan</span>
                <select value={repayment.loan_id} onChange={(e) => handleRepaymentLoanSelect(e.target.value)} required>
                  <option value="">Select loan</option>
                  {loans.filter((loan) => loan.status !== 'completed').map((loan) => (
                    <option key={loan.id} value={loan.id}>
                      {loan.full_name} ({loan.member_number}) - balance {money(loan.remaining_balance)}
                    </option>
                  ))}
                </select>
              </label>
              <FormField
                label="Remaining balance (UGX)"
                type="text"
                inputMode="numeric"
                value={repayment.amount}
                onChange={(e) => setRepayment({ ...repayment, amount: formatAmountInput(e.target.value) })}
                required
              />
              <FormField
                label="Next due date"
                value={repayment.next_due_date}
                readOnly
                placeholder="Select a loan"
              />
              {selectedLoan && (
                <div className="repayment-summary">
                  <div className="rp-row">
                    <span className="rp-label">Member</span>
                    <span className="rp-value">{selectedLoan.full_name} ({selectedLoan.member_number})</span>
                  </div>
                  <div className="rp-row">
                    <span className="rp-label">Status</span>
                    <span className="rp-value"><StatusBadge status={selectedLoan.status} /></span>
                  </div>
                </div>
              )}
              <Button>Record repayment</Button>
            </form>
          </Panel>

          <Panel title="Loan book">
            <DataTable
              rows={loans}
              columns={[
                { key: 'full_name', label: 'Member name' },
                { key: 'member_number', label: 'Member number' },
                { key: 'principal', label: 'Amount borrowed', render: (row) => money(row.principal) },
                { key: 'remaining_balance', label: 'Balance', render: (row) => money(row.remaining_balance) },
                { key: 'installment_amount', label: 'Payment amount', render: (row) => money(row.installment_amount) },
                { key: 'due_date', label: 'Due', render: (row) => shortDate(row.due_date) },
                { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
              ]}
            />
          </Panel>
        </>
      </LoadingRetry>

      <ConfirmModal
        open={showConfirmIssue}
        title="Confirm issue loan"
        onConfirm={confirmIssue}
        onCancel={() => setShowConfirmIssue(false)}
      >
        <dl className="details">
          <dt>Member name</dt>
          <dd>{selectedMemberIssue?.full_name || '-'}</dd>
          <dt>Member number</dt>
          <dd>{selectedMemberIssue?.member_number || '-'}</dd>
          <dt>Amount borrowed</dt>
          <dd>{money(stripCommas(loanForm.principal) || 0)}</dd>
        </dl>
        {actionError && <p className="alert">{actionError}</p>}
      </ConfirmModal>

      <ConfirmModal
        open={showConfirmRepay}
        title="Confirm repayment"
        onConfirm={confirmPay}
        onCancel={() => setShowConfirmRepay(false)}
      >
        <dl className="details">
          <dt>Member name</dt>
          <dd>{selectedLoan?.full_name || '-'}</dd>
          <dt>Member number</dt>
          <dd>{selectedLoan?.member_number || '-'}</dd>
          <dt>Amount</dt>
          <dd>{money(stripCommas(repayment.amount) || 0)}</dd>
          <dt>Next due date</dt>
          <dd>{repayment.next_due_date || '-'}</dd>
        </dl>
        {actionError && <p className="alert">{actionError}</p>}
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