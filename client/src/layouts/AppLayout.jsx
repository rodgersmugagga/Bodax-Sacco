import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, CreditCard, Home, LogOut, Menu, Users, WalletCards } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const nav = {
  MEMBER: [
    ['/', 'Dashboard', Home],
    ['/member/loans', 'Loans', CreditCard],
    ['/member/statements', 'Statements', WalletCards],
    ['/member/profile', 'Profile', Users],
  ],
  TREASURER: [
    ['/', 'Treasurer dashboard', Home],
    ['/treasurer/members', 'Members', Users],
    ['/treasurer/savings', 'Savings', WalletCards],
    ['/treasurer/confirm-deposits', 'Confirm deposits', WalletCards],
    ['/treasurer/confirm-loans', 'Confirm loans', CreditCard],
    ['/treasurer/loans', 'Loans', CreditCard],
    ['/treasurer/reports', 'Reports', BarChart3],
  ],
  CHAIRMAN: [
    ['/', 'Dashboard', Home],
    ['/chairman/analytics', 'Analytics', BarChart3],
    ['/chairman/reports', 'Reports', WalletCards],
  ],
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = nav[user.role_code] || [];

  function signOut() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>Bodax SACCO</strong>
          <span>Mbarara</span>
        </div>
        <nav>
          {items.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="logout" onClick={signOut}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>
            <span>{user.role_name}</span>
            <strong>{user.full_name || user.email}</strong>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
