import { Panel, StatCard } from '../../components/Card.jsx';
import { useApi } from '../../hooks/useApi.js';
import { money } from '../../utils/format.js';

export default function TreasurerDashboard() {
  const { data } = useApi('/reports/dashboard/treasurer', {});
  return (
    <div className="page-stack">
      <h1>Treasurer Dashboard</h1>
      <div className="stat-grid">
        <StatCard label="Active members" value={data.active_members || 0} />
        <StatCard label="Today" value={money(data.daily_collections)} />
        <StatCard label="This week" value={money(data.weekly_collections)} />
        <StatCard label="This month" value={money(data.monthly_collections)} />
        <StatCard label="Active loans" value={data.active_loans || 0} />
        <StatCard label="Pending loan requests" value={data.pending_loan_requests || 0} tone="warn" />
      </div>
      <Panel title="Quick work">
        <div className="quick-grid">
          <a href="/treasurer/savings">Record savings</a>
          <a href="/treasurer/confirm-deposits">Confirm deposits</a>
          <a href="/treasurer/confirm-loans">Confirm loans</a>
          <a href="/treasurer/members">Register member</a>
          <a href="/treasurer/loans">Issue loan</a>
        </div>
      </Panel>
    </div>
  );
}
