import { useState } from 'react';
import { logs } from '../mockData';

const levels = ['all', 'info', 'warn', 'error', 'debug'];

export default function SystemLogs() {
  const [lvl, setLvl] = useState('all');
  const rows = lvl === 'all' ? logs : logs.filter((l) => l.level === lvl);

  return (
    <div className="ad-section">
      <div className="glass-card">
        <div className="card-head">
          <h3>System Logs</h3>
          <span className="hint">{rows.length} events</span>
        </div>
        <div className="log-toolbar">
          {levels.map((l) => (
            <button key={l} className={`log-chip ${lvl === l ? 'active' : ''}`} onClick={() => setLvl(l)}>
              {l}
            </button>
          ))}
        </div>
        <div className="log-list">
          {rows.map((r) => (
            <div className="log-row" key={r.id}>
              <span className="time">{r.time}</span>
              <span className={`lvl lvl-${r.level}`}>{r.level}</span>
              <span className="src">[{r.source}]</span>
              <span className="msg">{r.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
