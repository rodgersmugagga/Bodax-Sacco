import { useState } from 'react';
import Button from '../../components/Button.jsx';
import DataTable from '../../components/DataTable.jsx';
import FormField from '../../components/FormField.jsx';
import { Panel } from '../../components/Card.jsx';
import SearchBox from '../../components/SearchBox.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { LoadingRetry } from '../../components/LoadingSpinner.jsx';
import api from '../../api/client.js';
import { useDelayedAsync } from '../../hooks/useDelayedAsync.js';

export default function Members() {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ member_number: '', full_name: '', phone_number: '', national_id: '', stage: 'Mbarara Central Stage', next_of_kin: '', password: '' });
  const [credentials, setCredentials] = useState({ member_id: '', password: '' });

  async function load() {
    const { data } = await api.get(`/members?search=${encodeURIComponent(search)}`);
    setMembers(data.data);
  }

  const { loading, error: loadError, onRetry } = useDelayedAsync(load, [search], {
    errorMessage: 'Failed to load members',
  });

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      await api.post('/members', form);
      setMessage('Member saved. They can log in using their phone number.');
      setForm({ ...form, member_number: '', full_name: '', phone_number: '', national_id: '', next_of_kin: '', password: '' });
      onRetry();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save member');
    }
  }

  async function saveCredentials(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      await api.patch(`/members/${credentials.member_id}/credentials`, { password: credentials.password });
      setMessage('Member login password updated.');
      setCredentials({ member_id: '', password: '' });
      onRetry();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update member password');
    }
  }

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="page-stack">
      <h1>Members</h1>
      {message && <p className="success">{message}</p>}
      {error && <p className="alert">{error}</p>}
      <Panel title="Register member">
        <form className="form-grid" onSubmit={submit}>
          <FormField label="Member number" value={form.member_number} onChange={(e) => update('member_number', e.target.value)} required />
          <FormField label="Full name" value={form.full_name} onChange={(e) => update('full_name', e.target.value)} required />
          <FormField label="Phone number" value={form.phone_number} onChange={(e) => update('phone_number', e.target.value)} required />
          <FormField label="National ID" value={form.national_id} onChange={(e) => update('national_id', e.target.value)} />
          <FormField label="Stage" value={form.stage} onChange={(e) => update('stage', e.target.value)} required />
          <FormField label="Next of kin" value={form.next_of_kin} onChange={(e) => update('next_of_kin', e.target.value)} />
          <FormField label="Login password" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} minLength="6" />
          <Button>Save member</Button>
        </form>
      </Panel>
      <Panel title="Set member login password">
        <form className="form-grid" onSubmit={saveCredentials}>
          <label className="field">
            <span>Member</span>
            <select value={credentials.member_id} onChange={(e) => setCredentials({ ...credentials, member_id: e.target.value })} required>
              <option value="">Select member</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name} - {member.phone_number}
                </option>
              ))}
            </select>
          </label>
          <FormField
            label="New login password"
            type="password"
            value={credentials.password}
            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
            minLength="6"
            required
          />
          <Button>Update password</Button>
        </form>
      </Panel>
      <Panel title="Search members" action={<SearchBox value={search} onChange={setSearch} placeholder="Name, phone, number" />}>
        <LoadingRetry loading={loading} error={loadError} onRetry={onRetry}>
          <DataTable
            rows={members}
            columns={[
              { key: 'member_number', label: 'Number' },
              { key: 'full_name', label: 'Name' },
              { key: 'phone_number', label: 'Phone' },
              { key: 'stage', label: 'Stage' },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            ]}
          />
        </LoadingRetry>
      </Panel>
    </div>
  );
}