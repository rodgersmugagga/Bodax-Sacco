import { Panel, StatCard } from '../../components/Card.jsx';
import { useApi } from '../../hooks/useApi.js';
import { money } from '../../utils/format.js';

export default function TreasurerDashboard() {
  const { data } = useApi('/reports/dashboard/treasurer', {});
  const overdue = useApi('/reports/overdue-loans', []);

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
        <StatCard label="Pending withdrawals" value={data.pending_withdrawals || 0} tone="warn" />
        <StatCard label="Overdue loans" value={overdue.data.length || 0} tone="danger" />
      </div>

      {/* Notification: new loan requests */}
      {data.pending_loan_requests > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: 'white',
            borderRadius: 'var(--radius)',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div>
            <strong style={{ fontSize: '1.1rem' }}>
              {data.pending_loan_requests} pending loan request{data.pending_loan_requests !== 1 ? 's' : ''}
            </strong>
            <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
              A member has submitted a new loan request awaiting your review.
            </p>
          </div>
          <a
            href="/treasurer/confirm-loans"
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              padding: '10px 20px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            Review now →
          </a>
        </div>
      )}

      {overdue.data.length > 0 && (
        <Panel title={`Overdue Loans — Most overdue first`}>
          <div className="overdue-list">
            {overdue.data.map((loan, i) => (
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
