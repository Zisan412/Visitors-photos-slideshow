import { ChevronDown, LogOut, MonitorPlay, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAppData } from '../hooks/useAppData.jsx';
import { Brand, Button } from './ui.jsx';

export default function AppShell() {
  const { user, setUser, showToast, toast, clearToast } = useAppData();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const dashboard = location.pathname === '/dashboard';
  const display = location.pathname === '/display';

  async function logout() {
    try {
      await api.post('/auth/logout', {});
    } catch (error) {
      if (error.status !== 401) {
        showToast(error.message, 'error');
        return;
      }
    }
    setUser(null);
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__inner">
          <Brand />
          <nav className="topbar__nav" aria-label="Main navigation">
            <Link className={dashboard ? 'nav-link nav-link--active' : 'nav-link'} to="/dashboard">My library</Link>
            <Link className={display ? 'nav-link nav-link--active' : 'nav-link'} to="/display"><MonitorPlay size={16} /> Display</Link>
          </nav>
          <div className="topbar__actions">
            {dashboard && (
              <Button as={Link} to="/folders/new" className="topbar__create"><Plus size={16} /> New folder</Button>
            )}
            {dashboard && (
              <button className="icon-button topbar__search" aria-label="Search folders" onClick={() => window.dispatchEvent(new Event('frame-search'))}>
                <Search size={18} />
              </button>
            )}
            <div className="profile">
              <button className="profile__button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}>
                <span className="avatar">{(user?.name || 'Guest').slice(0, 1).toUpperCase()}</span>
                <span className="profile__name">{user?.name || 'Guest'}</span>
                <ChevronDown size={15} />
              </button>
              {menuOpen && <div className="profile__menu"><Button variant="menu-danger" onClick={logout}><LogOut size={15} /> Log out</Button></div>}
            </div>
          </div>
        </div>
      </header>
      <main className="page"><Outlet /></main>
      <footer className="footer"><Brand /><span>A little room for the moments that matter.</span><Link to="/display">Set up a display <MonitorPlay size={14} /></Link></footer>
      {toast && <div className={`toast toast--${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}><span>{toast.message}</span><button aria-label="Dismiss message" onClick={clearToast}>×</button></div>}
    </div>
  );
}
