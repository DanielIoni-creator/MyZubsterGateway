import { useContext, useMemo, useState } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';
import '../components/admin/admin.css';
import './apidocs.css';
import { apiEndpoints, groups, API_BASE } from '../data/apiEndpoints';

const TABS = [
  { key: 'curl', label: 'cURL' },
  { key: 'javascript', label: 'JavaScript' },
  { key: 'python', label: 'Python' },
];

function buildExamples(ep) {
  const url = API_BASE + ep.path;
  const hasBody = ep.sample && Object.keys(ep.sample).length > 0;
  const bodyStr = hasBody ? JSON.stringify(ep.sample, null, 2) : '';

  const curl =
    `curl -X ${ep.method} "${url}" \\\n` +
    `  -H "Content-Type: application/json"` +
    (hasBody ? ` \\\n  -d '${bodyStr}'` : '');

  const js =
    `const res = await fetch("${url}", {\n` +
    `  method: "${ep.method}",\n` +
    `  headers: { "Content-Type": "application/json" }` +
    (hasBody ? `,\n  body: JSON.stringify(${JSON.stringify(ep.sample)})` : '') +
    `\n});\nconst data = await res.json();\nconsole.log(data);`;

  const py =
    `import requests\n\n` +
    `resp = requests.${ep.method.toLowerCase()}(\n` +
    `    "${url}"` +
    (hasBody ? `,\n    json=${JSON.stringify(ep.sample)}` : '') +
    `\n)\nprint(resp.json())`;

  return { curl, javascript: js, python: py };
}

function MethodBadge({ method }) {
  return <span className={`apim-method ${method.toLowerCase()}`}>{method}</span>;
}

function EndpointCard({ ep }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('curl');
  const [copied, setCopied] = useState(false);
  const examples = useMemo(() => buildExamples(ep), [ep]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(examples[tab]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="apim-endpoint glass-card">
      <button className="apim-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <MethodBadge method={ep.method} />
        <code className="apim-path">{ep.path}</code>
        <span className="apim-chevron" data-open={open}>›</span>
      </button>
      <p className="apim-desc">{ep.description}</p>
      {ep.auth && <span className="apim-flag">🔒 auth</span>}
      {ep.admin && <span className="apim-flag admin">🛡 admin</span>}

      {open && (
        <div className="apim-examples">
          <div className="apim-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`apim-tab ${tab === t.key ? 'active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
            <button className="apim-copy" onClick={copy}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre className="apim-code"><code>{examples[tab]}</code></pre>
        </div>
      )}
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useContext(ThemeContext);
  const opts = [
    { key: 'light', icon: '☀', label: 'Light' },
    { key: 'dark', icon: '☾', label: 'Dark' },
    { key: 'system', icon: '⚙', label: 'System' },
  ];
  return (
    <div className="ad-theme-toggle" role="group" aria-label="Theme">
      {opts.map((o) => (
        <button
          key={o.key}
          className={theme === o.key ? 'active' : ''}
          onClick={() => setTheme(o.key)}
          title={o.label}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}

export default function ApiDocs() {
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState('all');
  const [navOpen, setNavOpen] = useState(false);

  const q = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    return groups
      .filter((g) => activeGroup === 'all' || g.key === activeGroup)
      .map((g) => ({
        ...g,
        endpoints: apiEndpoints.filter(
          (ep) =>
            ep.group === g.key &&
            (!q ||
              `${ep.method} ${ep.path} ${ep.description} ${ep.group}`
                .toLowerCase()
                .includes(q)
            ),
        ),
      }))
      .filter((g) => g.endpoints.length > 0);
  }, [q, activeGroup]);

  const totalVisible = filteredGroups.reduce((n, g) => n + g.endpoints.length, 0);

  const navItems = [{ key: 'all', label: 'All endpoints' }, ...groups];

  return (
    <div className="admin-shell apidocs-shell">
      <aside className={`ad-sidebar ${navOpen ? 'open' : ''}`}>
        <div className="ad-logo">
          <div className="ad-logo-mark">M</div>
          <div className="ad-logo-text">
            MyZubster<small>API Reference</small>
          </div>
        </div>
        <nav className="ad-nav">
          <div className="ad-nav-label">Groups</div>
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`ad-nav-item ${activeGroup === item.key ? 'active' : ''}`}
              onClick={() => {
                setActiveGroup(item.key);
                setNavOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="ad-sidebar-foot">
          <div className="ad-avatar">MZ</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Free issue #147</div>
            <div style={{ fontSize: 11, color: 'var(--ad-muted)' }}>Community UI</div>
          </div>
        </div>
      </aside>

      {navOpen && <div className="ad-scrim show" onClick={() => setNavOpen(false)} />}

      <div className="ad-main">
        <header className="ad-topbar">
          <button
            className="ad-icon-btn ad-menu-btn"
            onClick={() => setNavOpen((o) => !o)}
            aria-label="Menu"
          >
            ☰
          </button>
          <div>
            <h1>API Documentation</h1>
            <div className="sub">
              {totalVisible} endpoint{totalVisible === 1 ? '' : 's'} · REST reference
            </div>
          </div>
          <div className="ad-search">
            <span aria-hidden>⌕</span>
            <input
              placeholder="Search endpoints…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search endpoints"
            />
          </div>
          <ThemeToggle />
        </header>

        <div className="ad-content apidocs-content">
          {filteredGroups.length === 0 && (
            <div className="apim-empty glass-card">
              No endpoints match “{query}”.
            </div>
          )}

          {filteredGroups.map((g) => (
            <section key={g.key} className="apim-group">
              <h2 className="apim-group-title">
                {g.label}
                <span className="apim-count">{g.endpoints.length}</span>
              </h2>
              <div className="apim-list">
                {g.endpoints.map((ep) => (
                  <EndpointCard key={ep.id} ep={ep} />
                ))}
              </div>
            </section>
          ))}

          <footer className="apim-foot">
            Endpoints reflect the current MyZubsterGateway backend routes. Base URL:{' '}
            <code>{API_BASE}</code>
          </footer>
        </div>
      </div>
    </div>
  );
}
