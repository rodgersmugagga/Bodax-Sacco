import ChartPanel from '../../components/ChartPanel.jsx';
import DataTable from '../../components/DataTable.jsx';
import { Panel, StatCard } from '../../components/Card.jsx';
import { useApi } from '../../hooks/useApi.js';
import { money, shortDate } from '../../utils/format.js';
import { LoadingRetry } from '../../components/LoadingSpinner.jsx';

export default function Analytics() {
  const { data, loading, error, onRetry } = useApi('/reports/analytics', { topSavers: [], defaulters: [], trend: [], income: {}, expenditure: {} });
  return (
    <LoadingRetry loading={loading} error={error} onRetry={onRetry}>
      <div className="page-stack">
        <h1>Analytics</h1>
        <div className="stat-grid">
          <StatCard label="Savings collected" value={money(data.income.savings_collected)} />
          <StatCard label="Loan repayments" value={money(data.income.loan_repayments)} />
          <StatCard label="Interest income" value={money(data.income.interest_income)} />
          <StatCard label="Withdrawals paid" value={money(data.expenditure.withdrawals_paid)} tone="warn" />
        </div>
        <ChartPanel title="Monthly growth" data={data.trend} />
        <Panel title="Loan arrears">
          <DataTable
            rows={data.defaulters}
            columns={[
              { key: 'full_name', label: 'Member name' },
              { key: 'member_number', label: 'Member number' },
              { key: 'balance', label: 'Amount overdue', render: (row) => money(row.balance) },
              { key: 'days_overdue', label: 'Days overdue', render: (row) => `${row.days_overdue || 0} day${Number(row.days_overdue) === 1 ? '' : 's'}` },
              { key: 'due_date', label: 'Due date', render: (row) => shortDate(row.due_date) },
            ]}
          />
        </Panel>
      </div>
    </LoadingRetry>
  );
}