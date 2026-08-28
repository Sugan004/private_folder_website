import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate() {
    const errors = {};
    if (!email.includes('@')) errors.email = 'Enter a valid email.';
    if (username.length < 3) errors.username = 'Username must be at least 3 characters.';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) errors.username = 'Letters, numbers, and underscores only.';
    if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setServerError('');
    setLoading(true);
    try {
      await register(email, username, password);
      navigate('/verify-otp');
    } catch (err) {
      setServerError(err?.response?.data?.error ?? 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-centered">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Shield size={20} color="#fff" />
          </div>
          <div>
            <div className="auth-title">Create Account</div>
            <div className="auth-subtitle">Join SecureVault today</div>
          </div>
        </div>

        {serverError && <div className="auth-server-error">{serverError}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              className={`input-field${fieldErrors.email ? ' error' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {fieldErrors.email && <span className="form-error">{fieldErrors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-username">Username</label>
            <input
              id="reg-username"
              type="text"
              className={`input-field${fieldErrors.username ? ' error' : ''}`}
              placeholder="john_doe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            {fieldErrors.username && <span className="form-error">{fieldErrors.username}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              className={`input-field${fieldErrors.password ? ' error' : ''}`}
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {fieldErrors.password && <span className="form-error">{fieldErrors.password}</span>}
          </div>

          <button
            id="btn-register"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem' }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
