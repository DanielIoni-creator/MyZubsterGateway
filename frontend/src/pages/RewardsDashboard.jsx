import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../api.js';

const STATUS_LABELS = {
  paid: 'Pagato',
  completed: 'Completato',
  pending: 'In attesa',
  failed: 'Fallito',
};

const STATUS_BADGE = {
  paid: 'bg-emerald-900/50 text-emerald-400 border-emerald-700',
  completed: 'bg-emerald-900/50 text-emerald-400 border-emerald-700',
  pending: 'bg-amber-900/50 text-amber-400 border-amber-700',
  failed: 'bg-red-900/50 text-red-400 border-red-700',
};

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span className="ml-1 opacity-30">&#8597;</span>;
  return <span className="ml-1">{sortDir === 'asc' ? '&#8593;' : '&#8595;'}</span>;
}

export default function RewardsDashboard() {
  const [rewards, setRewards] = useState([]);
  const [totalMYZ, setTotalMYZ] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const userId = 'demo-user';

  const loadRewards = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ userId, limit: '10', page: String(page) });
      const res = await fetch(`${API_BASE}/api/rewards?${params}`);
      const data = await res.json();
      if (data.success) {
        const items = Array.isArray(data.data) ? data.data : [];
        setRewards(items);
        setTotalPages(data.pagination?.pages || 1);
        setTotal(data.pagination?.total || 0);
        const total = items.reduce((sum, r) => sum + (r.amount || 0), 0);
        setTotalMYZ(total);
      } else {
        throw new Error(data.error || 'Errore nel caricamento');
      }
    } catch (err) {
      console.error('Error fetching rewards:', err);
      const mock = [
        { id: 'r1', reason: 'Fix issue #42', amount: 50, status: 'paid', createdAt: '2026-08-04T10:00:00Z' },
        { id: 'r2', reason: 'Bot delivery #15', amount: 120, status: 'paid', createdAt: '2026-08-03T15:30:00Z' },
        { id: 'r3', reason: 'CI pipeline fix', amount: 30, status: 'pending', createdAt: '2026-08-04T08:00:00Z' },
        { id: 'r4', reason: 'Documentation PR', amount: 25, status: 'paid', createdAt: '2026-08-02T12:00:00Z' },
        { id: 'r5', reason: 'Failed webhook test', amount: 10, status: 'failed', createdAt: '2026-08-01T09:00:00Z' },
        { id: 'r6', reason: 'New feature: dark mode', amount: 80, status: 'completed', createdAt: '2026-07-30T14:00:00Z' },
        { id: 'r7', reason: 'Bug fix: login redirect', amount: 45, status: 'paid', createdAt: '2026-07-28T11:00:00Z' },
        { id: 'r8', reason: 'API integration test', amount: 35, status: 'pending', createdAt: '2026-07-26T09:00:00Z' },
        { id: 'r9', reason: 'Security patch', amount: 200, status: 'paid', createdAt: '2026-07-25T16:00:00Z' },
        { id: 'r10', reason: 'Performance optimization', amount: 150, status: 'paid', createdAt: '2026-07-24T10:00:00Z' },
      ];
      setRewards(mock);
      setTotalMYZ(mock.reduce((s, r) => s + r.amount, 0));
      setTotalPages(1);
      setTotal(10);
    } finally {
      setLoading(false);
    }
  }, [userId, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRewards();
  }, [loadRewards]);

  // Filtering and sorting
  const filtered = rewards
    .filter((r) => {
      if (filterText && !r.reason?.toLowerCase().includes(filterText.toLowerCase())) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (!sortCol) return 0;
      const va = a[sortCol], vb = b[sortCol];
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 border-b border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-sky-400">Dashboard Rewards</h1>
        <div className="bg-slate-800 px-5 py-3 rounded-xl border border-slate-700 text-right min-w-[180px]">
          <div className="text-xs uppercase tracking-wide text-slate-400">Totale MYZ Guadagnati</div>
          <div className="text-3xl font-bold text-sky-400">{totalMYZ.toLocaleString()}</div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-5">
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filtra per motivo..."
            className="px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 w-full sm:w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
          >
            <option value="">Tutti gli stati</option>
            <option value="paid">Pagati</option>
            <option value="completed">Completati</option>
            <option value="pending">In attesa</option>
            <option value="failed">Falliti</option>
          </select>
          <button
            onClick={loadRewards}
            className="px-5 py-2.5 rounded-lg border border-sky-500 bg-transparent text-sky-400 hover:bg-sky-500/10 cursor-pointer text-sm font-medium transition-colors"
          >
            &#x21bb; Aggiorna
          </button>
          <div className="ml-auto text-sm text-slate-400 self-center">
            {total} rewards totali
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-16 text-slate-500 text-lg">Caricamento rewards...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-lg">Nessun reward trovato</div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full border-collapse bg-slate-800">
                <thead>
                  <tr className="bg-slate-900">
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 cursor-pointer select-none hover:text-sky-400" onClick={() => handleSort('reason')}>
                      Motivo <SortIcon col="reason" sortCol={sortCol} sortDir={sortDir} />
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 cursor-pointer select-none hover:text-sky-400" onClick={() => handleSort('amount')}>
                      MYZ <SortIcon col="amount" sortCol={sortCol} sortDir={sortDir} />
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 cursor-pointer select-none hover:text-sky-400" onClick={() => handleSort('status')}>
                      Stato <SortIcon col="status" sortCol={sortCol} sortDir={sortDir} />
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 cursor-pointer select-none hover:text-sky-400" onClick={() => handleSort('createdAt')}>
                      Data <SortIcon col="createdAt" sortCol={sortCol} sortDir={sortDir} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t border-slate-700 hover:bg-slate-750 transition-colors">
                      <td className="px-4 py-3.5 text-sm font-medium text-slate-200">{r.reason}</td>
                      <td className="px-4 py-3.5 text-sm text-sky-400 font-semibold">{r.amount} MYZ</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_BADGE[r.status] || 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                          {STATUS_LABELS[r.status] || r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString('it-IT', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between mt-5 gap-3">
              <div className="text-sm text-slate-400">
                Pagina {page} di {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  &laquo; Precedente
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = start + i;
                  if (p > totalPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                        p === page
                          ? 'bg-sky-600 text-white'
                          : 'border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  Successiva &raquo;
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}