import { Panel, StatCard } from '../../components/Card.jsx';
import { useApi } from '../../hooks/useApi.js';
import { money } from '../../utils/format.js';

export default function ChairmanDashboard() {
  const { data } = useApi('/reports/dashboard/chairman', {});
  const overdue = useApi('/reports/overdue-loans', []);

  return (
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
        <Panel title={`Overdue Loans (${overdue.data.length}) — Most overdue first`}>
          <div className="overdue-list">
            {[...overdue.data]
              .sort((a, b) => b.days_overdue - a.days_overdue)
              .map((loan, i) => (
              <div key={i} className="overdue-item">
                <div className="od-row">
                  <span className="od-label">Member</span>
                  <span className="od-value">{loan.full_name} — {loan.member_number}</span>
                </div>
                <div className="od-row">
                  <span className="od-label">Amount Overdue</span>
                  <span className="od-value">{money(loan.amount_overdue)}</span>
                </div>
                <div className="od-row">
                  <span className="od-label">Days Overdue</span>
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
  );
}
