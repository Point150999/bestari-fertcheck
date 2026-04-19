import { useState } from 'react';
import './index.css';
import { getUser, logout, ROLE_LABELS } from './utils/api';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RekomendasiPage from './pages/RekomendasiPage';
import RealisasiPage from './pages/RealisasiPage';
import FormInputPage from './pages/FormInputPage';
import AdminPage from './pages/AdminPage';
import { LayoutDashboard, FileText, History, PenLine, Settings, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', mobileLabel: 'Home', icon: LayoutDashboard, roles: ['admin', 'rceo', 'area_controller', 'manager', 'asisten'] },
  { id: 'rekomendasi', label: 'Rekomendasi Pupuk', mobileLabel: 'Rekom', icon: FileText, roles: ['admin', 'rceo', 'area_controller', 'manager', 'asisten', 'mandor'] },
  { id: 'realisasi', label: 'Realisasi / Historis', mobileLabel: 'Historis', icon: History, roles: ['admin', 'rceo', 'area_controller', 'manager', 'asisten', 'mandor'] },
  { id: 'form-input', label: 'Form Input', mobileLabel: 'Input', icon: PenLine, roles: ['admin', 'asisten', 'mandor'] },
  { id: 'admin', label: 'Admin Panel', mobileLabel: 'Admin', icon: Settings, roles: ['admin'] },
];

function getDefaultPage(role) {
  if (role === 'mandor') return 'rekomendasi';
  return 'dashboard';
}

export default function App() {
  const [user, setUser] = useState(getUser());
  const [activePage, setActivePage] = useState(user ? getDefaultPage(user.role) : 'dashboard');

  if (!user) return <LoginPage onLogin={(u) => { setUser(u); setActivePage(getDefaultPage(u.role)); }} />;

  const visibleNav = NAV_ITEMS.filter(n => n.roles.includes(user.role));

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardPage user={user} />;
      case 'rekomendasi': return <RekomendasiPage user={user} />;
      case 'realisasi': return <RealisasiPage user={user} />;
      case 'form-input': return <FormInputPage user={user} />;
      case 'admin': return <AdminPage />;
      default: return <DashboardPage user={user} />;
    }
  };

  return (
    <div className="app-layout">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">🌿</div>
          <div className="sidebar-title">
            <h1>Bestari FertCheck</h1>
            <p>Manajemen Pemupukan</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Menu</div>
            {visibleNav.map(item => (
              <button key={item.id} className={`nav-item ${activePage === item.id ? 'active' : ''}`} onClick={() => setActivePage(item.id)}>
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user.nama?.charAt(0)?.toUpperCase()}</div>
            <div className="user-details">
              <div className="user-name">{user.nama}</div>
              <div className="user-role">{ROLE_LABELS[user.role]}</div>
            </div>
            <button className="btn-logout" onClick={logout} title="Logout"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      {/* Main Content - includes mobile header inside */}
      <main className="main-content">
        {/* Mobile Header - inside main so it takes full width */}
        <div className="mobile-header">
          <div className="logo-mini">🌿</div>
          <h1>Bestari FertCheck</h1>
          <button className="btn-logout" onClick={logout} title="Logout"><LogOut size={18} /></button>
        </div>

        {renderPage()}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav">
        <div className="bottom-nav-items">
          {visibleNav.map(item => (
            <button key={item.id} className={`bottom-nav-item ${activePage === item.id ? 'active' : ''}`} onClick={() => setActivePage(item.id)}>
              <item.icon size={20} />
              <span>{item.mobileLabel}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
