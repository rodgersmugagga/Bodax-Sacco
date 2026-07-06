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

export default function Withdrawals() {
  const [requests, setRequests] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionError, setActionError] = useState('');

  async function load() {
    const { data } = await api.get('/withdrawals/requests');
    setRequests(data);
  }

  const { loading, error, onRetry } = useDelayedAsync(load, [], {
    errorMessage: 'Failed to load withdrawal requests',
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
      await api.patch(`/withdrawals/requests/${row.id}/review`, { action });
      setConfirmAction(null);
      onRetry();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to review withdrawal request');
    }
  }

  return (
    <div className="page-stack">
      <h1>Withdrawals</h1>
      <Panel title="Withdrawal requests">
        {actionError && <p className="alert">{actionError}</p>}
        <LoadingRetry loading={loading} error={error} onRetry={onRetry}>
          <DataTable
            rows={requests}
            columns={[
              { key: 'full_name', label: 'Member name' },
              { key: 'member_number', label: 'Member number' },
              { key: 'amount', label: 'Requested amount', render: (row) => money(row.amount) },
              { key: 'available_savings', label: 'Available savings', render: (row) => money(row.available_savings) },
              { key: 'requested_at', label: 'Requested', render: (row) => shortDate(row.requested_at) },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
              {
                key: 'actions',
                label: 'Action',
                render: (row) =>
                  row.status === 'pending' ? (
                    <div className="row-actions">
                      <Button variant="secondary" onClick={() => promptReview(row, 'approve')}>Approve</Button>
                      <Button variant="danger" onClick={() => promptReview(row, 'reject')}>Reject</Button>
                    </div>
                  ) : '-',
              },
            ]}
          />
        </LoadingRetry>
      </Panel>

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.action === 'approve' ? 'Approve withdrawal request' : 'Reject withdrawal request'}
        confirmLabel={confirmAction?.action === 'approve' ? 'Approve' : 'Reject'}
        onConfirm={executeReview}
        onCancel={() => setConfirmAction(null)}
        variant={confirmAction?.action === 'approve' ? 'primary' : 'danger'}
      >
        <p>You are about to <strong>{confirmAction?.action}</strong> this withdrawal request.</p>
        <dl className="details">
          <dt>Member name</dt>
          <dd>{confirmAction?.row?.full_name || '-'}</dd>
          <dt>Member number</dt>
          <dd>{confirmAction?.row?.member_number || '-'}</dd>
          <dt>Requested amount</dt>
          <dd>{confirmAction?.row ? money(confirmAction.row.amount) : '-'}</dd>
          <dt>Available savings</dt>
          <dd>{confirmAction?.row ? money(confirmAction.row.available_savings) : '-'}</dd>
        </dl>
        {actionError && <p className="alert">{actionError}</p>}
      </ConfirmModal>
    </div>
  );
}