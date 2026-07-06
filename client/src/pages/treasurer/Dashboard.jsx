import { Panel, StatCard } from '../../components/Card.jsx';
import { useApi } from '../../hooks/useApi.js';
import { money } from '../../utils/format.js';
import { LoadingRetry } from '../../components/LoadingSpinner.jsx';

export default function TreasurerDashboard() {
  const { data, loading, error, onRetry } = useApi('/reports/dashboard/treasurer', {});
  const overdue = useApi('/reports/overdue-loans', []);

  const retryAll = () => {
    onRetry();
    overdue.onRetry();
  };

  return (
    <LoadingRetry loading={loading || overdue.loading} error={error || overdue.error} onRetry={retryAll}>
      <div className="page-stack">
        <h1>Treasurer Dashboard</h1>
        <div className="stat-grid">
          <StatCard label="Active members" value={data.active_members || 0} />
          <StatCard label="Today" value={money(data.daily_collections)} />
          <StatCard label="This week" value={money(data.weekly_collections)} />
          <StatCard label="This month" value={money(data.monthly_collections)} />
          <StatCard label="Active loans" value={data.active_loans || 0} />
          <StatCard label="Pending loan requests" value={data.pending_loan_requests || 0} tone="warn" />
          <StatCard label="Pending withdrawals" value={data.pending_withdrawals || 0} tone="warn" />
          <StatCard label="Overdue loans" value={overdue.data.length || 0} tone="danger" />
        </div>

        {data.pending_loan_requests > 0 && (
          <div className="notice-banner notice-banner-warn">
            <div>
              <strong>{data.pending_loan_requests} pending loan request{data.pending_loan_requests !== 1 ? 's' : ''}</strong>
              <p>A member has submitted a new loan request awaiting your review.</p>
            </div>
            <a href="/treasurer/confirm-loans">Review now</a>
          </div>
        )}

        {overdue.data.length > 0 && (
          <Panel title="Overdue loans - most overdue first">
            <div className="overdue-list">
              {[...overdue.data]
                .sort((a, b) => b.days_overdue - a.days_overdue)
                .map((loan, i) => (
                  <div key={i} className="overdue-item">
                    <div className="od-row">
                      <span className="od-label">Member name</span>
                      <span className="od-value">{loan.full_name}</span>
                    </div>
                    <div className="od-row">
                      <span className="od-label">Member number</span>
                      <span className="od-value">{loan.member_number}</span>
                    </div>
                    <div className="od-row">
                      <span className="od-label">Amount overdue</span>
                      <span className="od-value">{money(loan.amount_overdue)}</span>
                    </div>
                    <div className="od-row">
                      <span className="od-label">Days overdue</span>
                      <span className={`overdue-badge ${loan.days_overdue > 30 ? 'overdue-badge-high' : 'overdue-badge-medium'}`}>
                        {loan.days_overdue} day{loan.days_overdue !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </Panel>
        )}

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
    </LoadingRetry>
  );
}