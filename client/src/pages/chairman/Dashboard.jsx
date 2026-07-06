import { Panel, StatCard } from '../../components/Card.jsx';
import { useApi } from '../../hooks/useApi.js';
import { money } from '../../utils/format.js';
import { LoadingRetry } from '../../components/LoadingSpinner.jsx';

export default function ChairmanDashboard() {
  const { data, loading, error, onRetry } = useApi('/reports/dashboard/chairman', {});
  const overdue = useApi('/reports/overdue-loans', []);

  const retryAll = () => {
    onRetry();
    overdue.onRetry();
  };

  return (
    <LoadingRetry loading={loading || overdue.loading} error={error || overdue.error} onRetry={retryAll}>
      <div className="page-stack">
        <h1>Chairman Dashboard</h1>
        <div className="stat-grid">
          <StatCard label="Members" value={data.members || 0} />
          <StatCard label="Total savings" value={money(data.total_savings)} />
          <StatCard label="Active loans" value={data.active_loans || 0} />
          <StatCard label="Outstanding loans" value={money(data.outstanding_loan_balance)} tone="warn" />
          <StatCard label="Loan arrears" value={money(data.loan_arrears)} tone="danger" />
          <StatCard label="Weekly collections" value={money(data.weekly_collections)} />
          <StatCard label="Monthly collections" value={money(data.monthly_collections)} />
        </div>

        {overdue.data.length > 0 && (
          <Panel title={`Loan arrears (${overdue.data.length}) - most overdue first`}>
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
      </div>
    </LoadingRetry>
  );
}