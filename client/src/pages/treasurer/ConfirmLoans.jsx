import { useEffect, useState } from 'react';
import Button from '../../components/Button.jsx';
import DataTable from '../../components/DataTable.jsx';
import { Panel } from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import api from '../../api/client.js';
import { money, shortDate } from '../../utils/format.js';

export default function ConfirmLoans() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('pending');

  async function load() {
    const params = filter ? `?status=${filter}` : '';
    const { data } = await api.get(`/loans/requests${params}`);
    setRequests(data);
  }

  useEffect(() => {
    load();
  }, [filter]);

  async function review(id, action) {
    await api.patch(`/loans/requests/${id}/review`, { action });
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
                      onClick={() => review(row.id, 'approve')}
                    >
                      Confirm
                    </Button>
                    <Button variant="danger" onClick={() => review(row.id, 'reject')}>
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
    </div>
  );
}
