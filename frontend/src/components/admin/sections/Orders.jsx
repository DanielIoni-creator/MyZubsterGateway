import { useState } from 'react';
import { orders } from '../mockData';
import { StatusBadge } from '../ui';

const chips = ['All', 'paid', 'pending', 'refunded', 'failed'];

export default function Orders() {
  const [f, setF] = useState('All');
  const rows = f === 'All' ? orders : orders.filter((o) => o.status === f);

  return (
    <div className="ad-section">
      <div className="glass-card">
        <div className="card-head">
          <h3>Orders</h3>
          <span className="hint">{rows.length} shown</span>
        </div>
        <div className="log-toolbar">
          {chips.map((c) => (
            <button key={c} className={`log-chip ${f === c ? 'active' : ''}`} onClick={() => setF(c)}>
              {c}
            </button>
          ))}
        </div>
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
