import { Shield, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
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
            <button className="btn btn-ghost btn-sm" onClick={logout} id="btn-logout">
              <LogOut size={14} />
              Sign out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
