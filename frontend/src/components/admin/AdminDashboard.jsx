import { useState, useContext } from 'react';
import './admin.css';
import { ThemeContext } from '../../contexts/ThemeContext';
import { navItems } from './mockData';
import { Icon } from './Icons';
import Overview from './sections/Overview';
import Users from './sections/Users';
import Orders from './sections/Orders';
import Bounties from './sections/Bounties';
import SystemLogs from './sections/SystemLogs';
import Settings from './sections/Settings';

const sections = {
  overview: Overview,
  users: Users,
  orders: Orders,
  bounties: Bounties,
  logs: SystemLogs,
  settings: Settings,
};

const titles = {
  overview: ['Overview', 'Gateway at a glance'],
  users: ['Users', 'Manage accounts & roles'],
  orders: ['Orders', 'Track payments & fulfillment'],
  bounties: ['Bounties', 'Community reward program'],
  logs: ['System Logs', 'Live event stream'],
  settings: ['Settings', 'Configure the gateway'],
};

const navIcon = {
  Overview: 'Overview',
  Users: 'Users',
  Orders: 'Orders',
  Bounties: 'Bounties',
  'System Logs': 'Logs',
  Settings: 'Settings',
};

export default function AdminDashboard() {
  const { theme, setTheme } = useContext(ThemeContext);
  const [active, setActive] = useState('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const Section = sections[active];
  const [title, sub] = titles[active];

  const go = (id) => {
    setActive(id);
    setMobileOpen(false);
  };

  return (
    <div className="admin-shell">
      {mobileOpen && <div className="ad-scrim show" onClick={() => setMobileOpen(false)} />}

      <aside className={`ad-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="ad-logo">
          <div className="ad-logo-mark">M</div>
          <div className="ad-logo-text">
            MyZubster<small>Admin Console</small>
          </div>
        </div>
        <div className="ad-nav">
          <div className="ad-nav-label">Management</div>
          {navItems.map((it) => {
            const Ic = Icon[navIcon[it.label]] || Icon.Overview;
            return (
              <div
                key={it.id}
                className={`ad-nav-item ${active === it.id ? 'active' : ''}`}
                onClick={() => go(it.id)}
              >
                <Ic width={19} height={19} />
                <span>{it.label}</span>
              </div>
            );
          })}
        </div>
        <div className="ad-sidebar-foot">
          <div className="ad-avatar">AB</div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>Aria Bellini</div>
            <div style={{ fontSize: '11px', color: 'var(--ad-muted)' }}>Administrator</div>
          </div>
        </div>
      </aside>

      <div className="ad-main">
        <header className="ad-topbar">
          <button className="ad-icon-btn ad-menu-btn" onClick={() => setMobileOpen((o) => !o)}>
            <Icon.Menu />
          </button>
          <div>
            <h1>{title}</h1>
            <div className="sub">{sub}</div>
          </div>
          <div className="ad-search">
            <Icon.Search width={16} height={16} />
            <input placeholder="Search…" />
          </div>
          <div className="ad-theme-toggle">
            <button
              className={theme === 'light' ? 'active' : ''}
              onClick={() => setTheme('light')}
              title="Light"
            >
              <Icon.Sun width={16} height={16} />
            </button>
            <button
              className={theme === 'system' ? 'active' : ''}
              onClick={() => setTheme('system')}
              title="System"
            >
              <Icon.Monitor width={16} height={16} />
            </button>
            <button
              className={theme === 'dark' ? 'active' : ''}
              onClick={() => setTheme('dark')}
              title="Dark"
            >
              <Icon.Moon width={16} height={16} />
            </button>
          </div>
          <button className="ad-icon-btn">
            <Icon.Bell width={18} height={18} />
          </button>
          <div className="ad-avatar">AB</div>
        </header>

        <main className="ad-content">
          <Section />
        </main>
      </div>
    </div>
  );
}
