import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  Play,
  FileText,
  ShieldAlert,
  Menu,
  ChevronLeft,
  ChevronRight,
  Search,
  ClipboardList,
  Mail,
  MessageSquare,
  Sparkles
} from 'lucide-react';

export default function Layout({ healthStatus }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="dashboard-container">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`} style={{ width: isCollapsed ? '80px' : '280px', transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', padding: isCollapsed ? '1.5rem 0.5rem' : '1.75rem 1.5rem', justifyContent: isCollapsed ? 'center' : 'space-between' }}>
          {!isCollapsed && <h2>GTM Operating System</h2>}
          {isCollapsed && <h2 style={{ fontSize: '1.25rem' }}>GTM</h2>}
          <button
            onClick={closeSidebar}
            className="hamburger-close-btn"
            style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.25rem', cursor: 'pointer', display: 'none' }}
          >
            ✕
          </button>
        </div>

        <nav className="sidebar-nav" style={{ padding: isCollapsed ? '1.5rem 0.5rem' : '1.5rem 0.75rem' }}>
          <NavLink to="/" onClick={closeSidebar} className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")} end>
            <LayoutDashboard size={20} />
            {!isCollapsed && <span>Executive Dashboard</span>}
          </NavLink>
          <NavLink to="/competitor-intelligence" onClick={closeSidebar} className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            <Search size={20} />
            {!isCollapsed && <span>Competitor Intel</span>}
          </NavLink>
          <NavLink to="/playground" onClick={closeSidebar} className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            <Sparkles size={20} />
            {!isCollapsed && <span>Agent Playground</span>}
          </NavLink>
          <NavLink to="/onboarding" onClick={closeSidebar} className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            <User size={20} />
            {!isCollapsed && <span>SME Input Profile</span>}
          </NavLink>
          <NavLink to="/cycles" onClick={closeSidebar} className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            <Play size={20} />
            {!isCollapsed && <span>Agent Workflow & Run</span>}
          </NavLink>
          <NavLink to="/content" onClick={closeSidebar} className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            <FileText size={20} />
            {!isCollapsed && <span>Content Viewer</span>}
          </NavLink>
          <NavLink to="/approvals" onClick={closeSidebar} className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            <ShieldAlert size={20} />
            {!isCollapsed && <span>Governance Gates</span>}
          </NavLink>
          <NavLink to="/dispatcher" onClick={closeSidebar} className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            <Mail size={20} />
            {!isCollapsed && <span>Email Dispatcher</span>}
          </NavLink>
          <NavLink to="/whatsapp-dispatcher" onClick={closeSidebar} className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            <MessageSquare size={20} />
            {!isCollapsed && <span>WhatsApp Dispatcher</span>}
          </NavLink>
          <NavLink to="/audit" onClick={closeSidebar} className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            <ClipboardList size={20} />
            {!isCollapsed && <span>Audit Trail</span>}
          </NavLink>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Hamburger for mobile toggle or desktop collapse */}
            <button
              onClick={() => {
                if (window.innerWidth <= 768) {
                  setSidebarOpen(!sidebarOpen);
                } else {
                  setIsCollapsed(!isCollapsed);
                }
              }}
              className="hamburger-btn"
              style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem' }}
            >
              <Menu size={24} />
            </button>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>GTM System Overview</h1>
          </div>
          <div>
            <span style={{ marginRight: '1rem', color: 'var(--text-secondary)' }}>
              Backend Status:
              <span className="status-badge" style={{
                marginLeft: '0.5rem',
                backgroundColor: healthStatus === 'Online' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: healthStatus === 'Online' ? 'var(--success)' : 'var(--danger)'
              }}>
                {healthStatus}
              </span>
            </span>
          </div>
        </header>

        {/* This Outlet renders the matched child route (Dashboard, Cycles, etc.) */}
        <div className="content-area">
          <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
