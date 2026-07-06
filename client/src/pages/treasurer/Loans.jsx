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
import { requiredField, positiveAmount, positiveInteger, percentRange, notPastDate, dateRequired, maxAmount, runValidation } from '../../utils/validate.js';
import { useDelayedAsync } from '../../hooks/useDelayedAsync.js';

export default function TreasurerLoans() {
  const [members, setMembers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loanForm, setLoanForm] = useState({ member_id: '', principal: '', interest_rate: 10, installment_count: 4, due_date: '' });
  const [repayment, setRepayment] = useState({ loan_id: '', amount: '', next_due_date: '' });
  const [loanErrors, setLoanErrors] = useState({});
  const [repayErrors, setRepayErrors] = useState({});
  const [message, setMessage] = useState('');
  const [apiError, setApiError] = useState('');
  const [loanSubmitting, setLoanSubmitting] = useState(false);
  const [repaySubmitting, setRepaySubmitting] = useState(false);
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

  function validateLoanForm() {
    return runValidation({
      member_id: requiredField(loanForm.member_id, 'Member'),
      principal: positiveAmount(stripCommas(loanForm.principal), 'Amount borrowed'),
      interest_rate: percentRange(loanForm.interest_rate, 'Interest rate'),
      installment_count: positiveInteger(loanForm.installment_count, 'Number of payments'),
      due_date: dateRequired(loanForm.due_date, 'Due date') || notPastDate(loanForm.due_date, 'Due date'),
    });
  }

  function validateRepayForm() {
    const selectedLoan = loans.find((l) => String(l.id) === String(repayment.loan_id));
    const maxRepay = selectedLoan ? Number(selectedLoan.remaining_balance) : Infinity;
    const amount = stripCommas(repayment.amount);

    return runValidation({
      loan_id: requiredField(repayment.loan_id, 'Loan'),
      amount: positiveAmount(amount, 'Amount') || maxAmount(amount, maxRepay, 'Amount'),
    });
  }

  function requestIssue(event) {
    event.preventDefault();
    setMessage('');
    setApiError('');

    const { errors: fieldErrors, isValid } = validateLoanForm();
    setLoanErrors(fieldErrors);
    if (!isValid) return;

    setShowConfirmIssue(true);
  }

  async function confirmIssue() {
    setLoanSubmitting(true);
    setApiError('');
    try {
      const cleanForm = { ...loanForm, principal: stripCommas(loanForm.principal) };
      await api.post('/loans', cleanForm);
      setMessage('Loan issued successfully.');
      setLoanForm({ member_id: '', principal: '', interest_rate: 10, installment_count: 4, due_date: '' });
      setLoanErrors({});
      setShowConfirmIssue(false);
      onRetry();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to issue loan. Please try again.');
    } finally {
      setLoanSubmitting(false);
    }
  }

  function requestPay(event) {
    event.preventDefault();
    setMessage('');
    setApiError('');

    const { errors: fieldErrors, isValid } = validateRepayForm();
    setRepayErrors(fieldErrors);
    if (!isValid) return;

    setShowConfirmRepay(true);
  }

  async function confirmPay() {
    setRepaySubmitting(true);
    setApiError('');
    try {
      const cleanForm = { loan_id: repayment.loan_id, amount: stripCommas(repayment.amount) };
      await api.post('/loans/repayments', cleanForm);
      setMessage('Repayment recorded successfully.');
      setRepayment({ loan_id: '', amount: '', next_due_date: '' });
      setRepayErrors({});
      setShowConfirmRepay(false);
      onRetry();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to record repayment. Please try again.');
    } finally {
      setRepaySubmitting(false);
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
          {message && <p className="success">{message}</p>}
          {apiError && <p className="alert">{apiError}</p>}
          <Panel title="Issue loan">
            <form className="form-grid" onSubmit={requestIssue} noValidate>
              <SelectMember members={members} value={loanForm.member_id} onChange={(value) => setLoanForm({ ...loanForm, member_id: value })} error={loanErrors.member_id} />
              <FormField
                label="Amount borrowed (UGX)"
                type="text"
                inputMode="numeric"
                value={loanForm.principal}
                onChange={(e) => setLoanForm({ ...loanForm, principal: formatAmountInput(e.target.value) })}
                error={loanErrors.principal}
                required
              />
              <FormField
                label="Interest %"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={loanForm.interest_rate}
                onChange={(e) => setLoanForm({ ...loanForm, interest_rate: e.target.value })}
                error={loanErrors.interest_rate}
              />
              <FormField
                label="Number of payments"
                type="number"
                min="1"
                max="60"
                step="1"
                value={loanForm.installment_count}
                onChange={(e) => setLoanForm({ ...loanForm, installment_count: e.target.value })}
                error={loanErrors.installment_count}
              />
              <FormField
                label="Due date"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={loanForm.due_date}
                onChange={(e) => setLoanForm({ ...loanForm, due_date: e.target.value })}
                error={loanErrors.due_date}
                required
              />
              <Button disabled={loanSubmitting}>{loanSubmitting ? 'Issuing...' : 'Issue loan'}</Button>
            </form>
          </Panel>

          <Panel title="Record repayment">
            <form className="form-grid" onSubmit={requestPay} noValidate>
              <label className={`field${repayErrors.loan_id ? ' select-error' : ''}`}>
                <span>Loan</span>
                <select value={repayment.loan_id} onChange={(e) => handleRepaymentLoanSelect(e.target.value)} required>
                  <option value="">Select loan</option>
                  {loans.filter((loan) => loan.status !== 'completed').map((loan) => (
                    <option key={loan.id} value={loan.id}>
                      {loan.full_name} ({loan.member_number}) - balance {money(loan.remaining_balance)}
                    </option>
                  ))}
                </select>
                {repayErrors.loan_id && <small className="field-error-msg">{repayErrors.loan_id}</small>}
              </label>
              <FormField
                label="Remaining balance (UGX)"
                type="text"
                inputMode="numeric"
                value={repayment.amount}
                onChange={(e) => setRepayment({ ...repayment, amount: formatAmountInput(e.target.value) })}
                error={repayErrors.amount}
                required
              />
              <FormField label="Next due date" value={repayment.next_due_date} readOnly placeholder="Select a loan" />
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
              <Button disabled={repaySubmitting}>{repaySubmitting ? 'Recording...' : 'Record repayment'}</Button>
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

      <ConfirmModal open={showConfirmIssue} title="Confirm issue loan" onConfirm={confirmIssue} onCancel={() => setShowConfirmIssue(false)}>
        <dl className="details">
          <dt>Member name</dt>
          <dd>{selectedMemberIssue?.full_name || '-'}</dd>
          <dt>Member number</dt>
          <dd>{selectedMemberIssue?.member_number || '-'}</dd>
          <dt>Amount borrowed</dt>
          <dd>{money(stripCommas(loanForm.principal) || 0)}</dd>
        </dl>
        {apiError && <p className="alert">{apiError}</p>}
      </ConfirmModal>

      <ConfirmModal open={showConfirmRepay} title="Confirm repayment" onConfirm={confirmPay} onCancel={() => setShowConfirmRepay(false)}>
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
        {apiError && <p className="alert">{apiError}</p>}
      </ConfirmModal>
    </div>
  );
}

function SelectMember({ members, value, onChange, error }) {
  return (
    <label className={`field${error ? ' select-error' : ''}`}>
      <span>Member</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} required>
        <option value="">Select member</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.full_name} - {member.member_number}
          </option>
        ))}
      </select>
      {error && <small className="field-error-msg">{error}</small>}
    </label>
  );
}