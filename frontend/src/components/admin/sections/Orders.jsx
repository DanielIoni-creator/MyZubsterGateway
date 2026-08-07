import { useState } from 'react';
import { orders } from '../mockData';
import { StatusBadge } from '../ui';
import { Icon } from '../Icons';
import { downloadCSV } from '../csv';

const chips = ['All', 'paid', 'pending', 'refunded', 'failed'];

export default function Orders() {
  const [f, setF] = useState('All');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  let rows = f === 'All' ? orders : orders.filter((o) => o.status === f);

  // Amount filter
  if (minAmount) {
    rows = rows.filter((o) => Number(o.amount) >= Number(minAmount));
  }
  if (maxAmount) {
    rows = rows.filter((o) => Number(o.amount) <= Number(maxAmount));
  }

  // Text search
  if (search.trim()) {
    const q = search.toLowerCase();
    rows = rows.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.customer.toLowerCase().includes(q)
    );
  }

  const handleExport = () => {
    const headers = ['Order ID', 'Customer', 'Items', 'Amount (XMR)', 'Date', 'Status'];
    const data = rows.map((o) => [o.id, o.customer, o.items, o.amount, o.date, o.status]);
    downloadCSV(`orders-export-${new Date().toISOString().slice(0, 10)}.csv`, headers, data);
  };

  return (
    <div className="ad-section">
      <div className="glass-card">
        <div className="card-head">
          <h3>Orders</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="hint">{rows.length} shown</span>
            <button
              className="btn-ghost"
              onClick={() => setShowFilters((s) => !s)}
              title="Toggle filters"
            >
              <Icon.Search width={14} height={14} />
            </button>
            <button className="btn-primary magnetic" onClick={handleExport}>
              Export CSV
            </button>
          </div>
        </div>
        <div className="log-toolbar">
          {chips.map((c) => (
            <button key={c} className={`log-chip ${f === c ? 'active' : ''}`} onClick={() => setF(c)}>
              {c}
            </button>
          ))}
        </div>

        {showFilters && (
          <div
            style={{
              display: 'flex',
              gap: '12px',
              padding: '14px 18px',
              borderBottom: '1px solid var(--ad-border)',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <input
              className="ad-input"
              style={{ width: '160px' }}
              placeholder="Search order / customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <input
              className="ad-input"
              style={{ width: '100px' }}
              type="number"
              min="0"
              step="0.01"
              placeholder="Min amount"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
            />
            <span style={{ color: 'var(--ad-muted)', fontSize: '13px' }}>—</span>
            <input
              className="ad-input"
              style={{ width: '100px' }}
              type="number"
              min="0"
              step="0.01"
              placeholder="Max amount"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
            />
          </div>
        )}

        <div className="card-body" style={{ padding: '0' }}>
          <table className="ad-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontFamily: 'var(--mono)' }}>{o.id}</td>
                  <td>{o.customer}</td>
                  <td>{o.items}</td>
                  <td>
                    <b>{o.amount}</b> XMR
                  </td>
                  <td>{o.date}</td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}