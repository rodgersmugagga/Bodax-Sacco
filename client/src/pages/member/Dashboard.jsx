import { useEffect, useRef, useState } from 'react';
import DataTable from '../../components/DataTable.jsx';
import { Panel, StatCard } from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { LoadingRetry } from '../../components/LoadingSpinner.jsx';
import { money, shortDate } from '../../utils/format.js';
import api from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDelayedAsync } from '../../hooks/useDelayedAsync.js';

export default function MemberDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({});
  const [statement, setStatement] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState(null);
  const [overdueReminder, setOverdueReminder] = useState(null);
  const previousSavingsRef = useRef(null);
  const shownReminderIdsRef = useRef(new Set());

  async function fetchDashboardData() {
    const { data: dashboardData } = await api.get('/reports/dashboard/member');
    const currentSavings = Number(dashboardData.total_savings || 0);
    const previousSavings = previousSavingsRef.current;

    if (previousSavings !== null && currentSavings > previousSavings) {
      setNotificationData({
        amount: currentSavings - previousSavings,
        date: new Date().toISOString().slice(0, 10),
      });
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 10000);
    }

    previousSavingsRef.current = currentSavings;
    setData(dashboardData);

    const overdueReminders = (dashboardData.loan_reminders || []).filter((reminder) => reminder.status === 'overdue');
    const newOverdue = overdueReminders.find((reminder) => !shownReminderIdsRef.current.has(reminder.id));
    if (newOverdue) {
      shownReminderIdsRef.current.add(newOverdue.id);
      setOverdueReminder(newOverdue);
      setTimeout(() => setOverdueReminder(null), 12000);
    }

    const from = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const to = new Date().toISOString().slice(0, 10);
    const { data: statementData } = await api.get(`/savings/statement?from=${from}&to=${to}`);
    setStatement(statementData);
    setLastUpdated(new Date());
  }

  const { loading, error, onRetry } = useDelayedAsync(fetchDashboardData, [], {
    errorMessage: 'Failed to load member dashboard',
  });

  useEffect(() => {
    const interval = setInterval(onRetry, 5000);
    return () => clearInterval(interval);
  }, [onRetry]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (!document.hidden) onRetry();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [onRetry]);

  return (
    <LoadingRetry loading={loading} error={error} onRetry={onRetry}>
      <div className="page-stack">
        <h1>Member Dashboard</h1>
        <h2 style={{ marginTop: '-12px', marginBottom: '24px', fontWeight: 'bold' }}>{user?.full_name} - {user?.member_number}</h2>

        {overdueReminder && (
          <div className="notification-popup dashboard-toast dashboard-toast-danger">
            <div>
              <h3>Loan Repayment Overdue</h3>
              <p>
                <strong>Bodax SACCO:</strong> Your loan repayment of <strong>{money(overdueReminder.remaining_balance)}</strong> was due on{' '}
                <strong>{shortDate(overdueReminder.due_date)}</strong>. Please repay as soon as possible.
              </p>
            </div>
            <button onClick={() => setOverdueReminder(null)}>x</button>
          </div>
        )}

        {showNotification && notificationData && (
          <div className="notification-popup dashboard-toast dashboard-toast-info">
            <div>
              <h3>SMS Confirmation Received</h3>
              <p>
                <strong>Bodax SACCO:</strong> Your savings deposit of <strong>{money(notificationData.amount)}</strong> has been received on {shortDate(notificationData.date)}.
              </p>
              <p>Thank you for saving with Bodax SACCO.</p>
            </div>
            <button onClick={() => setShowNotification(false)}>x</button>
          </div>
        )}

        <p className="text-muted" style={{ fontSize: '0.875rem' }}>
          Last updated: {lastUpdated.toLocaleTimeString()} (Auto-refreshes every 5 seconds)
        </p>

        {data.latest_savings_notification?.amount && (
          <Panel title="Latest Savings Confirmation">
            <p style={{ fontSize: '16px' }}>
              <strong>SMS:</strong> Your savings of <strong>{money(data.latest_savings_notification.amount)}</strong> were received on{' '}
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
                { key: 'principal', label: 'Amount borrowed', render: (row) => money(row.principal) },
                { key: 'remaining_balance', label: 'Remaining', render: (row) => money(row.remaining_balance) },
                { key: 'installment_amount', label: 'Payment amount', render: (row) => money(row.installment_amount) },
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
                { key: 'requested_amount', label: 'Amount borrowed', render: (row) => money(row.requested_amount) },
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
      </div>
    </LoadingRetry>
  );
}