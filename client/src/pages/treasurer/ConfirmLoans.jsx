import { useState } from 'react';
import Button from '../../components/Button.jsx';
import DataTable from '../../components/DataTable.jsx';
import { Panel } from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { LoadingRetry } from '../../components/LoadingSpinner.jsx';
import api from '../../api/client.js';
import { money, shortDate } from '../../utils/format.js';
import { useDelayedAsync } from '../../hooks/useDelayedAsync.js';

export default function ConfirmLoans() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionError, setActionError] = useState('');

  async function load() {
    const params = filter ? `?status=${filter}` : '';
    const { data } = await api.get(`/loans/requests${params}`);
    setRequests(data);
  }

  const { loading, error, onRetry } = useDelayedAsync(load, [filter], {
    errorMessage: 'Failed to load loan requests',
  });

  function promptReview(row, action) {
    setActionError('');
    setConfirmAction({ row, action });
  }

  async function executeReview() {
    if (!confirmAction) return;
    const { row, action } = confirmAction;
    setActionError('');
    try {
      await api.patch(`/loans/requests/${row.id}/review`, { action });
      setConfirmAction(null);
      onRetry();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to review loan request');
    }
  }

  return (
    <div className="page-stack">
      <h1>Confirm loans</h1>
      <Panel title="Loan requests">
        <div className="row-actions" style={{ marginBottom: '16px' }}>
          {['pending', 'approved', 'rejected', ''].map((status) => (
            <Button
              key={status || 'all'}
              variant={filter === status ? 'primary' : 'secondary'}
              onClick={() => setFilter(status)}
            >
              {status || 'All'}
            </Button>
          ))}
        </div>
        {actionError && <p className="alert">{actionError}</p>}
        <LoadingRetry loading={loading} error={error} onRetry={onRetry}>
          <DataTable
            rows={requests}
            columns={[
              { key: 'full_name', label: 'Member name' },
              { key: 'member_number', label: 'Member number' },
              { key: 'requested_amount', label: 'Requested amount', render: (row) => money(row.requested_amount) },
              { key: 'total_savings', label: 'Confirmed savings', render: (row) => money(row.total_savings) },
              { key: 'purpose', label: 'Purpose', render: (row) => row.purpose || '-' },
              { key: 'due_date', label: 'Due date', render: (row) => shortDate(row.due_date) },
              {
                key: 'eligibility_status',
                label: 'Eligibility',
                render: (row) => (
                  <span title={row.eligibility_reason}>
                    <StatusBadge status={row.eligibility_status} />
                  </span>
                ),
              },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
              {
                key: 'actions',
                label: 'Action',
                render: (row) =>
                  row.status === 'pending' ? (
                    <div className="row-actions">
                      <Button
                        variant="secondary"
                        disabled={row.eligibility_status !== 'eligible'}
                        onClick={() => promptReview(row, 'approve')}
                      >
                        Approve
                      </Button>
                      <Button variant="danger" onClick={() => promptReview(row, 'reject')}>
                        Reject
                      </Button>
                    </div>
                  ) : (
                    '-'
                  ),
              },
            ]}
          />
        </LoadingRetry>
      </Panel>

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.action === 'approve' ? 'Approve loan request' : 'Reject loan request'}
        confirmLabel={confirmAction?.action === 'approve' ? 'Approve' : 'Reject'}
        onConfirm={executeReview}
        onCancel={() => setConfirmAction(null)}
        variant={confirmAction?.action === 'approve' ? 'primary' : 'danger'}
      >
        <p>You are about to <strong>{confirmAction?.action}</strong> this loan request.</p>
        {confirmAction?.row && (
          <div className="review-card">
            <div className="rv-item">
              <span className="rv-label">Member name</span>
              <span className="rv-value">{confirmAction.row.full_name}</span>
            </div>
            <div className="rv-item">
              <span className="rv-label">Member number</span>
              <span className="rv-value">{confirmAction.row.member_number || '-'}</span>
            </div>
            <div className="rv-item">
              <span className="rv-label">Requested amount</span>
              <span className="rv-value">{money(confirmAction.row.requested_amount)}</span>
            </div>
            <div className="rv-item">
              <span className="rv-label">Confirmed savings</span>
              <span className="rv-value">{money(confirmAction.row.total_savings || 0)}</span>
            </div>
          </div>
        )}
        {actionError && <p className="alert">{actionError}</p>}
      </ConfirmModal>
    </div>
  );
}