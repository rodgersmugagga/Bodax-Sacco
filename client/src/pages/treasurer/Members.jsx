import { useEffect, useState } from 'react';
import Button from '../../components/Button.jsx';
import DataTable from '../../components/DataTable.jsx';
import FormField from '../../components/FormField.jsx';
import { Panel } from '../../components/Card.jsx';
import SearchBox from '../../components/SearchBox.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import api from '../../api/client.js';

const DEFAULT_STAGE = 'Mbarara Central Stage';

function isValidUgandanPhone(value) {
  return /^(0\d{9}|\+256\d{9})$/.test(value.replace(/\s/g, ''));
}

export default function Members() {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ member_number: '', full_name: '', phone_number: '', national_id: '', stage: DEFAULT_STAGE, next_of_kin: '', password: '' });
  const [credentials, setCredentials] = useState({ member_id: '', password: '' });

  function clearForm() {
    setForm({ member_number: '', full_name: '', phone_number: '', national_id: '', stage: DEFAULT_STAGE, next_of_kin: '', password: '' });
  }

  async function load() {
    try {
      const { data } = await api.get(`/members?search=${encodeURIComponent(search)}`);
      setMembers(data.data);
    } catch (err) {
      setError('Failed to load members');
    }
  }

  useEffect(() => {
    load();
  }, [search]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    const phone = form.phone_number.trim();
    if (!isValidUgandanPhone(phone)) {
      setError('Enter a valid Ugandan phone number (e.g. 0772123456 or +256772123456)');
      return;
    }

    if (!form.full_name.trim() || form.full_name.trim().length < 2) {
      setError('Full name must be at least 2 characters');
      return;
    }

    if (!form.member_number.trim()) {
      setError('Member number is required');
      return;
    }

    try {
      await api.post('/members', {
        ...form,
        member_number: form.member_number.trim(),
        full_name: form.full_name.trim(),
        phone_number: phone,
        national_id: form.national_id.trim() || undefined,
        stage: form.stage.trim(),
        next_of_kin: form.next_of_kin.trim() || undefined,
        password: form.password || undefined,
      });
      setMessage('Member saved. They can log in using their phone number.');
      clearForm();
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save member');
    }
  }

  async function saveCredentials(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!credentials.member_id) {
      setError('Please select a member');
      return;
    }
    if (!credentials.password || credentials.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      await api.patch(`/members/${credentials.member_id}/credentials`, { password: credentials.password });
      setMessage('Member login password updated.');
      setCredentials({ member_id: '', password: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password');
    }
  }

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="page-stack">
      <h1>Members</h1>
      <Panel title="Register member">
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
        <form className="form-grid" onSubmit={submit}>
          <FormField label="Member number" value={form.member_number} onChange={(e) => update('member_number', e.target.value)} required maxLength="40" />
          <FormField label="Full name" value={form.full_name} onChange={(e) => update('full_name', e.target.value)} required minLength="2" maxLength="160" />
          <FormField label="Phone number" value={form.phone_number} onChange={(e) => update('phone_number', e.target.value)} required maxLength="30" placeholder="0772123456 or +256772123456" />
          <FormField label="National ID" value={form.national_id} onChange={(e) => update('national_id', e.target.value)} maxLength="80" />
          <FormField label="Stage" value={form.stage} onChange={(e) => update('stage', e.target.value)} required maxLength="120" />
          <FormField label="Next of kin" value={form.next_of_kin} onChange={(e) => update('next_of_kin', e.target.value)} maxLength="160" />
          <FormField label="Login password" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} minLength="6" maxLength="128" />
          <Button>Save member</Button>
        </form>
      </Panel>
      <Panel title="Set member login password">
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
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
            maxLength="128"
            required
          />
          <Button>Update password</Button>
        </form>
      </Panel>
      <Panel title="Search members" action={<SearchBox value={search} onChange={setSearch} placeholder="Name, phone, number" />}>
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
      </Panel>
    </div>
  );
}