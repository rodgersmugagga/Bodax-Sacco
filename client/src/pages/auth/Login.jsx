import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
      setError('');
    try {
      await login(identifier, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div>
          <strong>Bodax SACCO</strong>
          <span>Mbarara Boda Boda savings and loans</span>
        </div>
        {error && <p className="alert">{error}</p>}
        <div>
          <FormField label="Phone number or email" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required />
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '-8px', marginBottom: '16px' }}>Use your phone number or email</p>
        </div>
        <FormField label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <Button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
        <p className="secondary-action">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </form>
    </main>
  );
}
