import { Shield, LogOut, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleLogout() {
    setShowConfirm(false);
    await logout();
  }

  return (
    <>
      <nav className="navbar">
        <Link to="/dashboard" className="navbar-brand">
          <div className="navbar-brand-icon">
            <Shield size={16} color="#fff" />
          </div>
          SecureVault
        </Link>

        <div className="navbar-actions">
          {user && (
            <>
              <span className="navbar-user">@{user.username || user.email}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowConfirm(true)} id="btn-logout">
                <LogOut size={14} />
                Sign out
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Sign Out</h3>
              <button className="icon-btn" onClick={() => setShowConfirm(false)} id="btn-cancel-logout">
                <X size={18} />
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem 0', fontSize: '0.9rem' }}>
              Are you sure you want to sign out of SecureVault?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleLogout} id="btn-confirm-logout">
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
