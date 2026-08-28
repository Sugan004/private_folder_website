import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function VerifyOtpPage() {
  const { verifyOtp, resendOtp, pendingEmail } = useAuth();
  const navigate = useNavigate();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);
  const errorTimerRef = useRef(null);

  // Redirect to register if no pending email
  useEffect(() => {
    if (!pendingEmail) navigate('/register', { replace: true });
  }, [pendingEmail, navigate]);

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setError(''), 5000);
    }
    return () => clearTimeout(errorTimerRef.current);
  }, [error]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  function handleOtpChange(index, value) {
    if (!/^\d*$/.test(value)) return; // digits only
    const next = [...otp];
    next[index] = value.slice(-1); // only last char
    setOtp(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter all 6 digits.'); return; }
    setError('');
    setLoading(true);
    try {
      await verifyOtp(pendingEmail, code);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error ?? 'Verification failed. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    try {
      await resendOtp(pendingEmail);
      setSuccess('A new OTP has been sent to your email!');
      setResendCooldown(60);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err?.response?.data?.error ?? 'Failed to resend OTP.');
    }
  }

  const maskedEmail = pendingEmail
    ? pendingEmail.replace(/(.{2}).+(@.+)/, '$1***$2')
    : '';

  return (
    <div className="page-centered">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Shield size={20} color="#fff" />
          </div>
          <div>
            <div className="auth-title">Verify Your Email</div>
            <div className="auth-subtitle">SecureVault</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <Mail size={20} color="#3b82f6" style={{ flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'left' }}>
              We've sent a 6-digit verification code to<br />
              <strong style={{ color: 'var(--text-primary)' }}>{maskedEmail}</strong>
            </p>
          </div>
        </div>

        {error && <div className="auth-server-error">{error}</div>}
        {success && <div style={{
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          color: '#4ade80',
          fontSize: '0.875rem',
          marginBottom: '1rem',
        }}>{success}</div>}

        <form onSubmit={handleSubmit}>
          {/* OTP Input Boxes */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                id={`otp-${i}`}
                style={{
                  width: '3rem',
                  height: '3.5rem',
                  textAlign: 'center',
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  background: 'var(--bg-input)',
                  border: `2px solid ${digit ? '#3b82f6' : 'var(--border-color)'}`,
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
            ))}
          </div>

          <button
            id="btn-verify-otp"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Verify Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem' }}>
            Didn't receive the code?
          </p>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleResend}
            disabled={resendCooldown > 0}
            id="btn-resend-otp"
            style={{ display: 'inline-flex', gap: '0.4rem' }}
          >
            <RefreshCw size={14} />
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
          </button>
        </div>
      </div>
    </div>
  );
}
