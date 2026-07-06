import DataTable from '../../components/DataTable.jsx';
import { Panel } from '../../components/Card.jsx';
import { useApi } from '../../hooks/useApi.js';
import { money, shortDate } from '../../utils/format.js';
import { LoadingRetry } from '../../components/LoadingSpinner.jsx';
import NotificationEventsTable from '../../components/NotificationEventsTable.jsx';

export default function ChairmanReports() {
  const { data, loading, error, onRetry } = useApi('/reports/analytics', { topSavers: [], defaulters: [], income: {}, expenditure: {} });
  return (
    <LoadingRetry loading={loading} error={error} onRetry={onRetry}>
      <div className="page-stack">
        <h1>Reports</h1>
        <Panel title="Annual report summary">
          <dl className="details">
            <dt>Income summary</dt>
            <dd>{money(Number(data.income.savings_collected || 0) + Number(data.income.loan_repayments || 0))}</dd>
            <dt>Expenditure summary</dt>
            <dd>{money(data.expenditure.withdrawals_paid)}</dd>
            <dt>Interest income</dt>
            <dd>{money(data.income.interest_income)}</dd>
          </dl>
        </Panel>
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
        <Panel title="Top savers">
          <DataTable
            rows={data.topSavers}
            columns={[
              { key: 'full_name', label: 'Member name' },
              { key: 'member_number', label: 'Member number' },
              { key: 'total', label: 'Total savings', render: (row) => money(row.total) },
            ]}
          />
        </Panel>
        <Panel title="SMS/WhatsApp notification events">
          <NotificationEventsTable />
        </Panel>
      </div>
    </LoadingRetry>
  );
}