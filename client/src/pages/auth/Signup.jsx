import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

function isValidUgandanPhone(value) {
  return /^(0\d{9}|\+256\d{9})$/.test(value.replace(/\s/g, ''));
}

function isValidMemberNumber(value) {
  return /^[a-zA-Z0-9\-/]+$/.test(value);
}

function isValidFullName(value) {
  return /^[a-zA-Z\s\-.']+$/.test(value);
}

export default function Signup() {
  const [memberNumber, setMemberNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [stage, setStage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  function validate() {
    const errors = {};

    if (!memberNumber.trim()) {
      errors.member_number = 'Member number is required';
    } else if (!isValidMemberNumber(memberNumber.trim())) {
      errors.member_number = 'Only letters, numbers, hyphens, and slashes allowed';
    }

    if (!fullName.trim()) {
      errors.full_name = 'Full name is required';
    } else if (fullName.trim().length < 2) {
      errors.full_name = 'Full name must be at least 2 characters';
    } else if (!isValidFullName(fullName.trim())) {
      errors.full_name = 'Only letters, spaces, hyphens, dots, and apostrophes allowed';
    }

    if (!phoneNumber.trim()) {
      errors.phone_number = 'Phone number is required';
    } else if (!isValidUgandanPhone(phoneNumber.trim())) {
      errors.phone_number = 'Enter a valid Ugandan number (e.g. 0772123456 or +256772123456)';
    }

    if (!stage.trim()) {
      errors.stage = 'Stage is required';
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Enter a valid email address or leave it blank';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});
    setMessage('');

    if (!validate()) {
      setLoading(false);
      setError('Please fix the validation errors below.');
      return;
    }

    try {
      await register({
        member_number: memberNumber.trim(),
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
        email: email.trim() || undefined,
        password,
        stage: stage.trim(),
      });
      await login(email?.trim() || phoneNumber.trim(), password);
      navigate('/');
    } catch (err) {
      if (err.response?.data?.details?.fieldErrors) {
        const errors = {};
        const errorsObj = err.response.data.details.fieldErrors;
        for (const key in errorsObj) {
          const cleanKey = key.replace('body.', '');
          errors[cleanKey] = errorsObj[key].join(', ');
        }
        setFieldErrors(errors);
        setError('Please fix the validation errors below.');
      } else {
        const msg = err.response?.data?.message || 'Signup failed';
        setError(msg);
        if (msg.includes('Member number')) {
          setFieldErrors({ member_number: msg });
        } else if (msg.includes('Phone number')) {
          setFieldErrors({ phone_number: msg });
        } else if (msg.includes('Email')) {
          setFieldErrors({ email: msg });
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div>
          <strong>Bodax SACCO</strong>
          <span>Create your member account</span>
        </div>
        {error && <p className="alert">{error}</p>}
        {message && <p className="success">{message}</p>}
        <FormField
          label="Member number"
          value={memberNumber}
          onChange={(event) => setMemberNumber(event.target.value)}
          error={fieldErrors.member_number}
          maxLength="40"
          required
        />
        <FormField
          label="Full name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          error={fieldErrors.full_name}
          maxLength="160"
          required
        />
        <FormField
          label="Phone number"
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
          error={fieldErrors.phone_number}
          maxLength="30"
          placeholder="0772123456 or +256772123456"
          required
        />
        <FormField
          label="Stage"
          value={stage}
          onChange={(event) => setStage(event.target.value)}
          error={fieldErrors.stage}
          maxLength="120"
          required
        />
        <FormField
          label="Email (optional)"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
          maxLength="255"
        />
        <FormField
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
          maxLength="128"
          required
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Sign up'}
        </Button>
        <p className="secondary-action">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </main>
  );
}