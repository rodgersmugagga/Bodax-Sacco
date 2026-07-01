import { useEffect, useState } from 'react';
import DataTable from '../../components/DataTable.jsx';
import { Panel, StatCard } from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { money, shortDate } from '../../utils/format.js';
import api from '../../api/client.js';

export default function MemberDashboard() {
  const [data, setData] = useState({});
  const [statement, setStatement] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [previousSavings, setPreviousSavings] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState(null);
  const [shownReminderIds, setShownReminderIds] = useState(new Set());
  const [overdueReminder, setOverdueReminder] = useState(null);

  // Fetch all dashboard data
  async function fetchDashboardData() {
    try {
      // Fetch main dashboard stats
      const { data: dashboardData } = await api.get('/reports/dashboard/member');
      
      const currentSavings = Number(dashboardData.total_savings || 0);
      const prevSavings = previousSavings !== null ? Number(previousSavings) : null;

      // Check if savings increased (new deposit detected)
      if (prevSavings !== null && currentSavings > prevSavings) {
        const newAmount = currentSavings - prevSavings;
        setNotificationData({
          amount: newAmount,
          date: new Date().toISOString().slice(0, 10)
        });
        setShowNotification(true);
        
        // Auto-hide notification after 10 seconds
        setTimeout(() => setShowNotification(false), 10000);
      }
      
      setPreviousSavings(currentSavings);
      setData(dashboardData);

      const overdueReminders = (dashboardData.loan_reminders || []).filter((r) => r.status === 'overdue');
      const newOverdue = overdueReminders.find((r) => !shownReminderIds.has(r.id));
      if (newOverdue) {
        setOverdueReminder(newOverdue);
        setShownReminderIds((prev) => new Set([...prev, newOverdue.id]));
        setTimeout(() => setOverdueReminder(null), 12000);
      }
      
      // Fetch statement
      const from = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
      const to = new Date().toISOString().slice(0, 10);
      const { data: statementData } = await api.get(`/savings/statement?from=${from}&to=${to}`);
      setStatement(statementData);
      
      setLastUpdated(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setLoading(false);
    }
  }

  // Initial load and auto-refresh every 5 seconds
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Also refresh when tab becomes visible
  useEffect(() => {
    function handleVisibilityChange() {
      if (!document.hidden) {
        fetchDashboardData();
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  if (loading) {
    return (
      <div className="page-stack">
        <h1>Member Dashboard</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <h1>Member Dashboard</h1>
      
      {/* Overdue loan reminder popup */}
      {overdueReminder && (
        <div
          className="notification-popup"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            zIndex: 9999,
            maxWidth: '400px',
            animation: 'slideIn 0.3s ease-out',
            border: '2px solid rgba(255,255,255,0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'start', gap: '15px' }}>
            <div style={{ fontSize: '32px' }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 'bold' }}>
                Loan Repayment Overdue
              </h3>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', lineHeight: '1.5' }}>
                <strong>Bodax SACCO:</strong> Your loan repayment of <strong>{money(overdueReminder.remaining_balance)}</strong> was due on{' '}
                <strong>{shortDate(overdueReminder.due_date)}</strong>. Please repay as soon as possible.
              </p>
            </div>
            <button
              onClick={() => setOverdueReminder(null)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0 8px',
                borderRadius: '4px',
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Pop-up SMS Notification */}
      {showNotification && notificationData && (
        <div 
          className="notification-popup"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            zIndex: 9999,
            maxWidth: '400px',
            animation: 'slideIn 0.3s ease-out',
            border: '2px solid rgba(255,255,255,0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'start', gap: '15px' }}>
            <div style={{ fontSize: '32px' }}>📱</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 'bold' }}>
                SMS Confirmation Received
              </h3>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', lineHeight: '1.5' }}>
                <strong>Bodax SACCO:</strong> Your savings deposit of <strong>{money(notificationData.amount)}</strong> has been received on {shortDate(notificationData.date)}.
              </p>
              <p style={{ margin: '0', fontSize: '12px', opacity: 0.8 }}>
                Thank you for saving with Bodax SACCO.
              </p>
            </div>
            <button
              onClick={() => setShowNotification(false)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0 8px',
                borderRadius: '4px'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      <p className="text-muted" style={{ fontSize: '0.875rem' }}>
        Last updated: {lastUpdated.toLocaleTimeString()} (Auto-refreshes every 5 seconds)
      </p>
      
      {/* Latest Savings Confirmation Panel */}
      {data.latest_savings_notification?.amount && (
        <Panel title="Latest Savings Confirmation">
          <p style={{ fontSize: '16px' }}>
            📱 <strong>SMS:</strong> Your savings of <strong>{money(data.latest_savings_notification.amount)}</strong> were received on{' '}
            <strong>{shortDate(data.latest_savings_notification.transaction_date)}</strong>.
          </p>
        </Panel>
      )}
      
      <div className="stat-grid">
        <StatCard label="Total savings" value={money(data.total_savings)} />
        <StatCard label="This week" value={money(data.week_savings)} />
        <StatCard label="This month" value={money(data.month_savings)} />
        <StatCard label="Active loan balance" value={money(data.active_loan_balance)} tone="warn" />
        <StatCard label="Paid this week" value={money(data.paid_this_week)} />
      </div>
      
      <Panel title="Active loans">
        {data.pending_loans?.length ? (
          <DataTable
            rows={data.pending_loans}
            columns={[
              { key: 'principal', label: 'Amount', render: (row) => money(row.principal) },
              { key: 'remaining_balance', label: 'Remaining', render: (row) => money(row.remaining_balance) },
              { key: 'installment_amount', label: 'Installment', render: (row) => money(row.installment_amount) },
              { key: 'due_date', label: 'Due date', render: (row) => shortDate(row.due_date) },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            ]}
          />
        ) : (
          <p>No active loans at the moment.</p>
        )}
      </Panel>

      <Panel title="Loan requests">
        {data.loan_requests?.length ? (
          <DataTable
            rows={data.loan_requests}
            columns={[
              { key: 'requested_amount', label: 'Amount', render: (row) => money(row.requested_amount) },
              { key: 'purpose', label: 'Purpose', render: (row) => row.purpose || '-' },
              { key: 'due_date', label: 'Due date', render: (row) => shortDate(row.due_date) },
              { key: 'eligibility_status', label: 'Eligibility', render: (row) => <StatusBadge status={row.eligibility_status} /> },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            ]}
          />
        ) : (
          <p>No loan requests yet. <a href="/member/loans">Apply for a loan</a></p>
        )}
      </Panel>
      
      <Panel title="Repayment reminders">
        {data.loan_reminders?.length ? (
          <ul className="list-notifications">
            {data.loan_reminders.map((reminder) => (
              <li key={`${reminder.id}-${reminder.due_date}`} className={reminder.status === 'overdue' ? 'reminder-overdue' : ''}>
                <strong>{reminder.text}</strong> - due {shortDate(reminder.due_date)} for {money(reminder.remaining_balance)}
              </li>
            ))}
          </ul>
        ) : (
          <p>You have no loan reminders right now.</p>
        )}
      </Panel>
      
      <Panel title="Recent transactions">
        <DataTable
          rows={statement.slice(0, 8)}
          columns={[
            { key: 'type', label: 'Type' },
            { key: 'date', label: 'Date', render: (row) => shortDate(row.date) },
            { key: 'amount', label: 'Amount', render: (row) => money(row.amount) },
          ]}
        />
      </Panel>
      
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}