import { users } from '../mockData';
import { StatusBadge, Avatar } from '../ui';
import { Icon } from '../Icons';
import { downloadCSV } from '../csv';

export default function Users() {
  const handleExport = () => {
    const headers = ['Name', 'Email', 'Role', 'Garden', 'Joined', 'Status'];
    const data = users.map((u) => [u.name, u.email, u.role, u.garden, u.joined, u.status]);
    downloadCSV(`users-export-${new Date().toISOString().slice(0, 10)}.csv`, headers, data);
  };

  return (
    <div className="ad-section">
      <div className="glass-card">
        <div className="card-head">
          <h3>All Users</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div className="ad-search" style={{ width: '180px' }}>
              <Icon.Search width={15} height={15} />
              <input placeholder="Filter users…" />
            </div>
            <button className="btn-primary magnetic" onClick={handleExport}>
              Export CSV
            </button>
            <button className="btn-primary magnetic">+ Invite</button>
          </div>
        </div>
        <div className="card-body" style={{ padding: '0' }}>
          <table className="ad-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Garden</th>
                <th>Joined</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="ad-user">
                      <Avatar name={u.name} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--ad-muted)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{u.role}</td>
                  <td>{u.garden}</td>
                  <td>{u.joined}</td>
                  <td>
                    <StatusBadge status={u.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-ghost">Manage</button>
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