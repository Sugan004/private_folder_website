import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, setPendingEmail, resendOtp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const errorTimerRef = useRef(null);

  // Clear error when user starts typing again
  function handleEmailChange(e) {
    setEmail(e.target.value);
    if (error) setError('');
  }

  function handlePasswordChange(e) {
    setPassword(e.target.value);
    if (error) setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      const errMsg = err?.response?.data?.error;
      if (errMsg === 'Please verify your email before logging in.') {
        // Automatically resend OTP and redirect to verify page
        setPendingEmail(email);
        try {
          await resendOtp(email);
        } catch (resendErr) {
          console.error('Failed to resend OTP on login', resendErr);
        }
        navigate('/verify-otp');
      } else {
        setError(errMsg ?? 'Login failed. Please try again.');
      }
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
            <div className="auth-title">SecureVault</div>
            <div className="auth-subtitle">Sign in to your account</div>
          </div>
        </div>

        {error && <div className="auth-server-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={handleEmailChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={handlePasswordChange}
                required
                autoComplete="current-password"
                style={{ paddingRight: '3rem' }}
              />
              <button
                type="button"
                className="icon-btn"
                style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)' }}
                onClick={() => setShowPw(!showPw)}
                tabIndex={-1}
                id="btn-toggle-password"
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            id="btn-login"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem' }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">Create one</Link>
        </p>
      </div>
    </div>
  );
}
