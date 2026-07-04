import { useState } from 'react';
import { Panel } from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import api from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Profile() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ current_password: '', new_password: '' });

  async function changePassword(event) {
    event.preventDefault();
    await api.patch('/auth/password', form);
    setMessage('Password updated successfully.');
    setForm({ current_password: '', new_password: '' });
  }

  return (
    <div className="page-stack">
      <h1>Profile</h1>
      
      <div style={{
        background: 'var(--surface-color)',
        padding: '24px',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border-color)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: 'bold' }}>{user.full_name}</h2>
            <p style={{ margin: '0 0 4px 0', color: 'var(--color-muted)' }}>Member Number: <strong>{user.member_number}</strong></p>
            <p style={{ margin: '0', color: 'var(--color-muted)' }}>Stage: <strong>{user.stage || 'N/A'}</strong></p>
          </div>
          <div>
            <StatusBadge status={user.status} />
          </div>
        </div>
      </div>

      <Panel title="Change login password">
        {message && <p className="success">{message}</p>}
        <form className="form-grid" onSubmit={changePassword}>
          <FormField
            label="Current password"
            type="password"
            value={form.current_password}
            onChange={(e) => setForm({ ...form, current_password: e.target.value })}
            minLength="6"
            required
          />
          <FormField
            label="New password"
            type="password"
            value={form.new_password}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
            minLength="6"
            required
          />
          <Button>Change password</Button>
        </form>
      </Panel>
    </div>
  );
}
