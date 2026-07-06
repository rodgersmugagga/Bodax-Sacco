import ChartPanel from '../../components/ChartPanel.jsx';
import DataTable from '../../components/DataTable.jsx';
import { Panel } from '../../components/Card.jsx';
import { useApi } from '../../hooks/useApi.js';
import { money, shortDate } from '../../utils/format.js';
import { LoadingRetry } from '../../components/LoadingSpinner.jsx';
import NotificationEventsTable from '../../components/NotificationEventsTable.jsx';

export default function TreasurerReports() {
  const { data, loading, error, onRetry } = useApi('/reports/analytics', { topSavers: [], defaulters: [], trend: [], income: {}, expenditure: {} });
  return (
    <LoadingRetry loading={loading} error={error} onRetry={onRetry}>
      <div className="page-stack">
        <h1>Reports</h1>
        <ChartPanel title="Monthly collections" data={data.trend} />
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
              { key: 'total', label: 'Savings', render: (row) => money(row.total) },
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