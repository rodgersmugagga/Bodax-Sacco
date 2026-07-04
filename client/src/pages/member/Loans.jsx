import { useEffect, useState } from 'react';
import Button from '../../components/Button.jsx';
import DataTable from '../../components/DataTable.jsx';
import FormField from '../../components/FormField.jsx';
import { Panel } from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import api from '../../api/client.js';
import { money, shortDate } from '../../utils/format.js';

export default function MemberLoans() {
  const [loans, setLoans] = useState([]);
  const [requests, setRequests] = useState([]);
  const [eligibility, setEligibility] = useState(null);
  const [form, setForm] = useState({ requested_amount: '', purpose: '', installment_count: 4, due_date: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const [loanResult, requestResult, eligibilityResult] = await Promise.all([
      api.get('/loans'),
      api.get('/loans/requests'),
      api.get('/loans/eligibility'),
    ]);
    setLoans(loanResult.data);
    setRequests(requestResult.data);
    setEligibility(eligibilityResult.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function checkAmount(amount) {
    if (!amount) {
      const { data } = await api.get('/loans/eligibility');
      setEligibility(data);
      return;
    }
    const { data } = await api.get(`/loans/eligibility?amount=${amount}`);
    setEligibility(data);
  }

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const { data } = await api.post('/loans/requests', form);
      setMessage(
        data.eligibility.eligible
          ? 'Loan request submitted. Awaiting treasurer confirmation.'
          : `Request submitted but marked ineligible: ${data.eligibility.reason}`,
      );
      setForm({ requested_amount: '', purpose: '', installment_count: 4, due_date: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit loan request');
    }
  }

  return (
    <div className="page-stack">
      <h1>Loans</h1>

      <Panel title="Loan eligibility">
        {eligibility ? (
          <div className={eligibility.eligible ? 'success' : 'alert'}>
            <p>{eligibility.reason}</p>
            <p className="text-muted">
              Total savings: {money(eligibility.total_savings)} · Max eligible: {money(eligibility.max_eligible_amount)}
            </p>
          </div>
        ) : (
          <p>Checking eligibility...</p>
        )}
      </Panel>

      <Panel title="Request a loan">
        {message && <p className="success">{message}</p>}
        {error && <p className="alert">{error}</p>}
        <form className="form-grid" onSubmit={submit}>
          <FormField
            label="Amount (UGX)"
            type="number"
            value={form.requested_amount}
            onChange={(e) => {
              setForm({ ...form, requested_amount: e.target.value });
              checkAmount(e.target.value);
            }}
            required
          />
          <FormField
            label="Purpose"
            value={form.purpose}
            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
          />
          <FormField
            label="Number of payments"
            type="number"
            value={form.installment_count}
            onChange={(e) => setForm({ ...form, installment_count: e.target.value })}
          />
          <FormField
            label="Repayment due date"
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            required
          />
          <Button>Submit loan request</Button>
        </form>
      </Panel>

      <Panel title="My loan requests">
        <DataTable
          rows={requests}
          columns={[
            { key: 'requested_amount', label: 'Amount', render: (row) => money(row.requested_amount) },
            { key: 'purpose', label: 'Purpose', render: (row) => row.purpose || '-' },
            { key: 'due_date', label: 'Due date', render: (row) => shortDate(row.due_date) },
            { key: 'eligibility_status', label: 'Eligibility', render: (row) => <StatusBadge status={row.eligibility_status} /> },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            { key: 'requested_at', label: 'Requested', render: (row) => shortDate(row.requested_at) },
          ]}
        />
      </Panel>

      <Panel title="Current and previous loans">
        <DataTable
          rows={loans}
          columns={[
            { key: 'principal', label: 'Loan amount', render: (row) => money(row.principal) },
            { key: 'remaining_balance', label: 'Balance', render: (row) => money(row.remaining_balance) },
            { key: 'installment_amount', label: 'Next installment', render: (row) => money(row.installment_amount) },
            { key: 'due_date', label: 'Due', render: (row) => shortDate(row.due_date) },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
          ]}
        />
      </Panel>
    </div>
  );
}
