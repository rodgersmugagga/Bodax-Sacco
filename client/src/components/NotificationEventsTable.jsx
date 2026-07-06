import DataTable from './DataTable.jsx';

const notificationEvents = [
  { event: 'Deposit recorded', trigger: 'Treasurer records and confirms a savings deposit.' },
  { event: 'Loan approved', trigger: 'Treasurer approves an eligible pending loan request.' },
  { event: 'Loan rejected', trigger: 'Treasurer rejects a pending loan request.' },
  { event: 'Loan due soon', trigger: 'Active loan due date falls within the next 7 days.' },
  { event: 'Loan overdue', trigger: 'Active loan has an unpaid balance after its due date.' },
  { event: 'Withdrawal approved', trigger: 'Treasurer approves a pending withdrawal request.' },
];

export default function NotificationEventsTable() {
  return (
    <DataTable
      rows={notificationEvents}
      columns={[
        { key: 'event', label: 'Event' },
        { key: 'trigger', label: 'Trigger condition' },
      ]}
    />
  );
}
