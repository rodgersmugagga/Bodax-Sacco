import { useEffect, useState } from 'react';
import Button from '../../components/Button.jsx';
import DataTable from '../../components/DataTable.jsx';
import { Panel } from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import api from '../../api/client.js';
import { money, shortDate } from '../../utils/format.js';

export default function ConfirmLoans() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [confirmAction, setConfirmAction] = useState(null);

  async function load() {
    const params = filter ? `?status=${filter}` : '';
    const { data } = await api.get(`/loans/requests${params}`);
    setRequests(data);
  }

  useEffect(() => {
    load();
  }, [filter]);

  function promptReview(row, action) {
    setConfirmAction({ row, action });
  }

  async function executeReview() {
    if (!confirmAction) return;
    const { row, action } = confirmAction;
    await api.patch(`/loans/requests/${row.id}/review`, { action });
    setConfirmAction(null);
    load();
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
        <DataTable
          rows={requests}
          columns={[
            { key: 'full_name', label: 'Member' },
            { key: 'requested_amount', label: 'Amount', render: (row) => money(row.requested_amount) },
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
            { key: 'requested_at', label: 'Requested', render: (row) => shortDate(row.requested_at) },
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
                      Confirm
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
      </Panel>

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.action === 'approve' ? 'Confirm Approve Loan' : 'Confirm Reject Loan'}
        onConfirm={executeReview}
        onCancel={() => setConfirmAction(null)}
        variant={confirmAction?.action === 'approve' ? 'primary' : 'danger'}
      >
        <p>You are about to <strong>{confirmAction?.action} loan</strong>.</p>
        
        {confirmAction?.row && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'var(--background-color)', padding: '16px', borderRadius: 'var(--radius)' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.875rem', color: 'var(--color-muted)', marginBottom: '4px' }}>Member Name</span>
              <strong>{confirmAction.row.full_name}</strong>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.875rem', color: 'var(--color-muted)', marginBottom: '4px' }}>Member Number</span>
              <strong>{confirmAction.row.member_number || '-'}</strong>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.875rem', color: 'var(--color-muted)', marginBottom: '4px' }}>Requested Amount</span>
              <strong>{money(confirmAction.row.requested_amount)}</strong>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.875rem', color: 'var(--color-muted)', marginBottom: '4px' }}>Confirmed Savings</span>
              <strong>{money(confirmAction.row.total_savings || 0)}</strong>
            </div>
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}
