import { useEffect, useState } from 'react';
import Button from '../../components/Button.jsx';
import DataTable from '../../components/DataTable.jsx';
import FormField from '../../components/FormField.jsx';
import { Panel } from '../../components/Card.jsx';
import SearchBox from '../../components/SearchBox.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import api from '../../api/client.js';
import {
  memberNumber,
  fullName,
  ugPhoneNumber,
  ugNationalId,
  requiredField,
  passwordStrength,
  minLength,
  runValidation,
} from '../../utils/validate.js';

export default function Members() {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [apiError, setApiError] = useState('');
  const [errors, setErrors] = useState({});
  const [credErrors, setCredErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [credSubmitting, setCredSubmitting] = useState(false);
  const [form, setForm] = useState({ member_number: '', full_name: '', phone_number: '', national_id: '', stage: 'Mbarara Central Stage', next_of_kin: '', password: '' });
  const [credentials, setCredentials] = useState({ member_id: '', password: '' });

  async function load() {
    const { data } = await api.get(`/members?search=${encodeURIComponent(search)}`);
    setMembers(data.data);
  }

  useEffect(() => {
    load();
  }, [search]);

  function validateMemberForm() {
    return runValidation({
      member_number: memberNumber(form.member_number, 'Member number'),
      full_name: fullName(form.full_name, 'Full name'),
      phone_number: ugPhoneNumber(form.phone_number, 'Phone number'),
      national_id: ugNationalId(form.national_id, 'National ID'),
      stage: requiredField(form.stage, 'Stage'),
      password: passwordStrength(form.password, 'Login password'),
    });
  }

  function validateCredentialsForm() {
    return runValidation({
      member_id: requiredField(credentials.member_id, 'Member'),
      password: minLength(credentials.password, 6, 'Password'),
    });
  }

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    setApiError('');

    const { errors: fieldErrors, isValid } = validateMemberForm();
    setErrors(fieldErrors);
    if (!isValid) return;

    setSubmitting(true);
    try {
      await api.post('/members', form);
      setMessage('Member saved. They can log in using their phone number.');
      setForm({ ...form, member_number: '', full_name: '', phone_number: '', national_id: '', next_of_kin: '', password: '' });
      setErrors({});
      load();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to save member. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveCredentials(event) {
    event.preventDefault();
    setMessage('');
    setApiError('');

    const { errors: fieldErrors, isValid } = validateCredentialsForm();
    setCredErrors(fieldErrors);
    if (!isValid) return;

    setCredSubmitting(true);
    try {
      await api.patch(`/members/${credentials.member_id}/credentials`, { password: credentials.password });
      setMessage('Member login password updated.');
      setCredentials({ member_id: '', password: '' });
      setCredErrors({});
      load();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to update password. Please try again.');
    } finally {
      setCredSubmitting(false);
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
        {apiError && <p className="alert">{apiError}</p>}
        <form className="form-grid" onSubmit={submit} noValidate>
          <FormField
            label="Member number"
            value={form.member_number}
            onChange={(e) => update('member_number', e.target.value)}
            placeholder="e.g. BDX-001"
            maxLength="20"
            error={errors.member_number}
            required
          />
          <FormField
            label="Full name"
            value={form.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            placeholder="First and last name"
            maxLength="80"
            error={errors.full_name}
            required
          />
          <FormField
            label="Phone number"
            type="tel"
            value={form.phone_number}
            onChange={(e) => update('phone_number', e.target.value)}
            placeholder="07XXXXXXXX"
            maxLength="15"
            error={errors.phone_number}
            required
          />
          <FormField
            label="National ID"
            value={form.national_id}
            onChange={(e) => update('national_id', e.target.value.toUpperCase())}
            placeholder="CM12345678AB (optional)"
            maxLength="14"
            error={errors.national_id}
          />
          <FormField
            label="Stage"
            value={form.stage}
            onChange={(e) => update('stage', e.target.value)}
            error={errors.stage}
            required
          />
          <FormField
            label="Next of kin"
            value={form.next_of_kin}
            onChange={(e) => update('next_of_kin', e.target.value)}
            maxLength="80"
          />
          <FormField
            label="Login password"
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            placeholder="Minimum 6 characters"
            minLength="6"
            maxLength="128"
            error={errors.password}
          />
          <Button disabled={submitting}>{submitting ? 'Saving...' : 'Save member'}</Button>
        </form>
      </Panel>
      <Panel title="Set member login password">
        <form className="form-grid" onSubmit={saveCredentials} noValidate>
          <label className={`field${credErrors.member_id ? ' select-error' : ''}`}>
            <span>Member</span>
            <select value={credentials.member_id} onChange={(e) => setCredentials({ ...credentials, member_id: e.target.value })} required>
              <option value="">Select member</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name} - {member.phone_number}
                </option>
              ))}
            </select>
            {credErrors.member_id && <small className="field-error-msg">{credErrors.member_id}</small>}
          </label>
          <FormField
            label="New login password"
            type="password"
            value={credentials.password}
            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
            placeholder="Minimum 6 characters"
            minLength="6"
            maxLength="128"
            error={credErrors.password}
            required
          />
          <Button disabled={credSubmitting}>{credSubmitting ? 'Updating...' : 'Update password'}</Button>
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
