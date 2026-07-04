import { useEffect, useState } from 'react';
import Button from '../../components/Button.jsx';
import DataTable from '../../components/DataTable.jsx';
import { Panel } from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import api from '../../api/client.js';
import { money, shortDate } from '../../utils/format.js';

export default function Withdrawals() {
  const [requests, setRequests] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null);

  async function load() {
    const { data } = await api.get('/withdrawals/requests');
    setRequests(data);
  }

  useEffect(() => {
    load();
  }, []);

  function promptReview(row, action) {
    setConfirmAction({ row, action });
  }

  async function executeReview() {
    if (!confirmAction) return;
    const { row, action } = confirmAction;
    await api.patch(`/withdrawals/requests/${row.id}/review`, { action });
    setConfirmAction(null);
    load();
  }

  return (
    <div className="page-stack">
      <h1>Withdrawals</h1>
      <Panel title="Withdrawal requests">
        <DataTable
          rows={requests}
          columns={[
            { key: 'full_name', label: 'Member' },
            { key: 'amount', label: 'Amount', render: (row) => money(row.amount) },
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
      </Panel>

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.action === 'approve' ? 'Confirm Approve Withdrawal' : 'Confirm Reject Withdrawal'}
        onConfirm={executeReview}
        onCancel={() => setConfirmAction(null)}
        variant={confirmAction?.action === 'approve' ? 'primary' : 'danger'}
      >
        <p>You are about to <strong>{confirmAction?.action} withdrawal</strong>.</p>
        <p><strong>Member:</strong> {confirmAction?.row?.full_name}</p>
        <p><strong>Amount:</strong> {confirmAction?.row ? money(confirmAction.row.amount) : ''}</p>
      </ConfirmModal>
    </div>
  );
}
