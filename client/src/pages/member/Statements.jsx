import { useState } from 'react';
import Button from '../../components/Button.jsx';
import DataTable from '../../components/DataTable.jsx';
import { Panel } from '../../components/Card.jsx';
import { LoadingRetry } from '../../components/LoadingSpinner.jsx';
import api from '../../api/client.js';
import { money, shortDate } from '../../utils/format.js';
import { useDelayedAsync } from '../../hooks/useDelayedAsync.js';

function defaultFrom() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
}

export default function MemberStatements() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([]);

  async function fetchStatement() {
    const { data } = await api.get(`/savings/statement?from=${from}&to=${to}`);
    setRows(data);
  }

  const { loading, error, onRetry } = useDelayedAsync(fetchStatement, [from, to], {
    immediate: false,
    errorMessage: 'Failed to load statement',
  });

  function loadStatement(event) {
    event?.preventDefault();
    onRetry();
  }

  function printStatement() {
    window.print();
  }

  return (
    <div className="page-stack">
      <h1>Statements</h1>
      <Panel title="Statement period">
        <form className="inline-form" onSubmit={loadStatement}>
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          <Button>View</Button>
          <Button type="button" variant="secondary" onClick={printStatement}>
            Print / PDF
          </Button>
        </form>
      </Panel>
      <Panel title="Statement">
        <LoadingRetry loading={loading} error={error} onRetry={onRetry}>
          <DataTable
            rows={rows}
            columns={[
              { key: 'type', label: 'Type' },
              { key: 'date', label: 'Date', render: (row) => shortDate(row.date) },
              { key: 'amount', label: 'Amount', render: (row) => money(row.amount) },
              { key: 'notes', label: 'Notes' },
            ]}
          />
        </LoadingRetry>
      </Panel>
    </div>
  );
}