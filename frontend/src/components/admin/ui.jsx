
const map = {
  active: 'b-active', paid: 'b-paid', open: 'b-open', done: 'b-done',
  pending: 'b-pending', 'in-review': 'b-in-review', claimed: 'b-claimed',
  suspended: 'b-suspended', failed: 'b-failed', refunded: 'b-refunded',
};

export function StatusBadge({ status }) {
  const cls = map[String(status).toLowerCase()] || 'b-pending';
  return <span className={`badge ${cls}`}>{status}</span>;
}

export function Avatar({ name }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return <span className="av">{initials}</span>;
}
