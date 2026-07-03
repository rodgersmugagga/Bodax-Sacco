import { useEffect, useState } from 'react';
import Button from '../../components/Button.jsx';
import DataTable from '../../components/DataTable.jsx';
import FormField from '../../components/FormField.jsx';
import { Panel } from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import api from '../../api/client.js';
import { money, shortDate } from '../../utils/format.js';
import {
  requiredField,
  positiveAmount,
  positiveInteger,
  percentRange,
  notPastDate,
  dateRequired,
  maxAmount,
  runValidation,
} from '../../utils/validate.js';

export default function TreasurerLoans() {
  const [members, setMembers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loanForm, setLoanForm] = useState({ member_id: '', principal: '', interest_rate: 10, installment_count: 4, due_date: '' });
  const [repayment, setRepayment] = useState({ loan_id: '', amount: '' });
  const [loanErrors, setLoanErrors] = useState({});
  const [repayErrors, setRepayErrors] = useState({});
  const [message, setMessage] = useState('');
  const [apiError, setApiError] = useState('');
  const [loanSubmitting, setLoanSubmitting] = useState(false);
  const [repaySubmitting, setRepaySubmitting] = useState(false);

  async function load() {
    const [memberResult, loanResult] = await Promise.all([api.get('/members?limit=100'), api.get('/loans')]);
    setMembers(memberResult.data.data);
    setLoans(loanResult.data);
  }

  useEffect(() => {
    load();
  }, []);

  function validateLoanForm() {
    return runValidation({
      member_id: requiredField(loanForm.member_id, 'Member'),
      principal: positiveAmount(loanForm.principal, 'Principal'),
      interest_rate: percentRange(loanForm.interest_rate, 'Interest rate'),
      installment_count: positiveInteger(loanForm.installment_count, 'Installments'),
      due_date: dateRequired(loanForm.due_date, 'Due date') || notPastDate(loanForm.due_date, 'Due date'),
    });
  }

  function validateRepayForm() {
    const selectedLoan = loans.find((l) => String(l.id) === String(repayment.loan_id));
    const maxRepay = selectedLoan ? Number(selectedLoan.remaining_balance) : Infinity;

    return runValidation({
      loan_id: requiredField(repayment.loan_id, 'Loan'),
      amount: positiveAmount(repayment.amount, 'Amount') || maxAmount(repayment.amount, maxRepay, 'Amount'),
    });
  }

  async function issue(event) {
    event.preventDefault();
    setMessage('');
    setApiError('');

    const { errors: fieldErrors, isValid } = validateLoanForm();
    setLoanErrors(fieldErrors);
    if (!isValid) return;

    setLoanSubmitting(true);
    try {
      await api.post('/loans', loanForm);
      setMessage('Loan issued successfully.');
      setLoanForm({ member_id: '', principal: '', interest_rate: 10, installment_count: 4, due_date: '' });
      setLoanErrors({});
      load();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to issue loan. Please try again.');
    } finally {
      setLoanSubmitting(false);
    }
  }

  async function pay(event) {
    event.preventDefault();
    setMessage('');
    setApiError('');

    const { errors: fieldErrors, isValid } = validateRepayForm();
    setRepayErrors(fieldErrors);
    if (!isValid) return;

    setRepaySubmitting(true);
    try {
      await api.post('/loans/repayments', repayment);
      setMessage('Repayment recorded successfully.');
      setRepayment({ loan_id: '', amount: '' });
      setRepayErrors({});
      load();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to record repayment. Please try again.');
    } finally {
      setRepaySubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <h1>Loans</h1>
      {message && <p className="success">{message}</p>}
      {apiError && <p className="alert">{apiError}</p>}
      <Panel title="Issue loan">
        <form className="form-grid" onSubmit={issue} noValidate>
          <SelectMember
            members={members}
            value={loanForm.member_id}
            onChange={(value) => setLoanForm({ ...loanForm, member_id: value })}
            error={loanErrors.member_id}
          />
          <FormField
            label="Principal (UGX)"
            type="number"
            min="1"
            step="1"
            value={loanForm.principal}
            onChange={(e) => setLoanForm({ ...loanForm, principal: e.target.value })}
            error={loanErrors.principal}
            required
          />
          <FormField
            label="Interest %"
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={loanForm.interest_rate}
            onChange={(e) => setLoanForm({ ...loanForm, interest_rate: e.target.value })}
            error={loanErrors.interest_rate}
          />
          <FormField
            label="Installments"
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
        <form className="form-grid" onSubmit={pay} noValidate>
          <label className={`field${repayErrors.loan_id ? ' select-error' : ''}`}>
            <span>Loan</span>
            <select value={repayment.loan_id} onChange={(e) => setRepayment({ ...repayment, loan_id: e.target.value })} required>
              <option value="">Select loan</option>
              {loans.filter((loan) => loan.status !== 'completed').map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {loan.full_name} - balance {money(loan.remaining_balance)}
                </option>
              ))}
            </select>
            {repayErrors.loan_id && <small className="field-error-msg">{repayErrors.loan_id}</small>}
          </label>
          <FormField
            label="Amount (UGX)"
            type="number"
            min="1"
            step="1"
            value={repayment.amount}
            onChange={(e) => setRepayment({ ...repayment, amount: e.target.value })}
            error={repayErrors.amount}
            required
          />
          <Button disabled={repaySubmitting}>{repaySubmitting ? 'Recording...' : 'Record repayment'}</Button>
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
