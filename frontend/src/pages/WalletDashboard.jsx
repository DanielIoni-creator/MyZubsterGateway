import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout/Layout';
import api from '../utils/axiosConfig';
import { useAuth } from '../contexts/AuthContext';

const StatusBadge = ({ status }) => {
  const meta = {
    completed:  { label: 'Completato',  cls: 'bg-green-100 text-green-800 border-green-300', dot: 'bg-green-500' },
    withdrawn:  { label: 'Ritirato',    cls: 'bg-blue-100 text-blue-800 border-blue-300',    dot: 'bg-blue-500' },
    pending:    { label: 'In attesa',   cls: 'bg-amber-100 text-amber-800 border-amber-300',  dot: 'bg-amber-500' },
    failed:     { label: 'Fallito',     cls: 'bg-red-100 text-red-800 border-red-300',        dot: 'bg-red-500' },
  };
  const m = meta[status] || { label: status || '—', cls: 'bg-gray-100 text-gray-700 border-gray-300', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${m.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
};

const StatCard = ({ icon, label, value, sub, accent }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-start gap-4 ${accent || ''}`}>
    <div className="text-3xl">{icon}</div>
    <div className="min-w-0">
      <div className="text-sm text-gray-500 font-medium">{label}</div>
      <div className="text-2xl font-bold text-gray-900 truncate">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  </div>
);

const WalletDashboard = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [xmrRate, setXmrRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ address: '', amount: '' });
  const [withdrawMsg, setWithdrawMsg] = useState(null);

  const userId = user?.id || user?._id || user?.userId || '';

  const fetchData = useCallback(async () => {
    try {
      setError('');
      const [balanceRes, rewardsRes, withdrawalsRes, xmrRes] = await Promise.allSettled([
        api.get(`/payout/balance?userId=${userId}`),
        api.get(`/rewards?userId=${userId}&limit=30`),
        api.get(`/payout/history?userId=${userId}`),
        api.get('/xmr/rate'),
      ]);

      if (balanceRes.status === 'fulfilled') setBalance(balanceRes.value.data?.balance || null);
      if (rewardsRes.status === 'fulfilled') setRewards(rewardsRes.value.data?.data || []);
      if (withdrawalsRes.status === 'fulfilled') setWithdrawals(withdrawalsRes.value.data?.withdrawals || []);
      if (xmrRes.status === 'fulfilled') setXmrRate(xmrRes.value.data?.data || xmrRes.value.data || null);
    } catch (err) {
      setError('Errore nel caricamento dei dati del wallet');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { if (userId) fetchData(); }, [userId, fetchData]);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawForm.address || !withdrawForm.amount) {
      setWithdrawMsg({ type: 'error', text: 'Inserisci indirizzo e importo.' });
      return;
    }
    setWithdrawing(true);
    setWithdrawMsg(null);
    try {
      const res = await api.post('/payout/withdraw', {
        userId,
        address: withdrawForm.address,
        amount: Number(withdrawForm.amount),
      });
      setWithdrawMsg({ type: 'success', text: `Prelievo richiesto! TX: ${res.data?.withdrawal?.txId || '—'}` });
      setWithdrawForm({ address: '', amount: '' });
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.error || 'Errore nel prelievo.';
      setWithdrawMsg({ type: 'error', text: msg });
    } finally {
      setWithdrawing(false);
    }
  };

  const exportCSV = () => {
    const rows = [
      ['Data/Ora', 'Importo', 'Valuta', 'Stato', 'Motivo', 'Fonte', 'TX'],
      ...rewards.map(r => [
        r.createdAt ? new Date(r.createdAt).toLocaleString('it-IT') : '—',
        r.amount ?? '—',
        r.currency || 'MYZ',
        r.status || '—',
        (r.reason || '').replace(/[\n,]/g, ' '),
        r.source || '—',
        r.txId || '—',
      ]),
    ];
    const csv = rows.map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myzubster-wallet-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const availableBalance = balance?.available ?? 0;
  const totalFees = rewards
    .filter(r => r.source === 'fee' || (r.reason || '').toLowerCase().includes('fee'))
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const allTransactions = [
    ...rewards.map(r => ({ ...r, type: r.amount >= 0 ? 'entrata' : 'uscita', date: r.createdAt })),
    ...withdrawals.map(w => ({ ...w, type: 'uscita', date: w.createdAt, amount: -Math.abs(w.amount) })),
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">👛 Wallet MyZubster</h1>
            <p className="text-gray-500 mt-1">Monitora saldo MYZ e XMR, transazioni e fee generate.</p>
          </div>
          <button
            onClick={exportCSV}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm"
          >
            ⬇️ Export Report (CSV)
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg">{error}</div>}
        {withdrawMsg && (
          <div className={`p-3 rounded-lg border ${withdrawMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {withdrawMsg.text}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-500">Caricamento wallet...</div>
        ) : (
          <>
            {/* Saldo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon="🪙" label="Saldo MYZ" value={`${Number(availableBalance).toLocaleString('it-IT')} MYZ`} sub="Disponibile per il prelievo" />
              <StatCard icon="🏦" label="Totale guadagnato" value={`${Number(balance?.totalEarned || 0).toLocaleString('it-IT')} MYZ`} sub="Somma dei reward completati" />
              <StatCard icon="📤" label="Totale ritirato" value={`${Number(balance?.totalWithdrawn || 0).toLocaleString('it-IT')} MYZ`} sub="Prelievi già effettuati" />
              <StatCard icon="💱" label="Tasso XMR" value={xmrRate ? `${xmrRate.rate ?? '—'}` : '—'} sub={xmrRate?.currency ? `1 XMR = ${xmrRate.rate} ${xmrRate.currency}` : 'Tasso di cambio' } />
            </div>

            {/* Fee generate */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-900">💰 Fee generate</h2>
                <span className="text-2xl font-bold text-blue-600">{Number(totalFees).toLocaleString('it-IT')} MYZ</span>
              </div>
              <p className="text-sm text-gray-500">Totale delle commissioni generate dalle tue attività.</p>
            </div>

            {/* Transazioni */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">📋 Transazioni</h2>
                <span className="text-xs text-gray-400">{allTransactions.length} voci</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-5 py-3">Data/Ora</th>
                      <th className="px-5 py-3">Importo</th>
                      <th className="px-5 py-3">Valuta</th>
                      <th className="px-5 py-3">Stato</th>
                      <th className="px-5 py-3">Motivo</th>
                      <th className="px-5 py-3">Fonte</th>
                      <th className="px-5 py-3">TX ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allTransactions.length === 0 ? (
                      <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Nessuna transazione trovata.</td></tr>
                    ) : allTransactions.slice(0, 20).map((tx, i) => (
                      <tr key={`${tx.id || tx._id || 'tx'}-${i}`} className="hover:bg-gray-50">
                        <td className="px-5 py-3 whitespace-nowrap text-gray-600">{tx.date ? new Date(tx.date).toLocaleString('it-IT') : '—'}</td>
                        <td className={`px-5 py-3 font-medium whitespace-nowrap ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.amount >= 0 ? '+' : ''}{Number(tx.amount).toLocaleString('it-IT')} {tx.currency || 'MYZ'}
                        </td>
                        <td className="px-5 py-3 text-gray-600">{tx.currency || 'MYZ'}</td>
                        <td className="px-5 py-3"><StatusBadge status={tx.status} /></td>
                        <td className="px-5 py-3 text-gray-600 max-w-[220px] truncate">{tx.reason || '—'}</td>
                        <td className="px-5 py-3 text-gray-500">{tx.source || '—'}</td>
                        <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">{tx.txId ? String(tx.txId).slice(0, 20) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Prelievo */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">📤 Richiedi prelievo</h2>
              <form onSubmit={handleWithdraw} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Indirizzo Tari</label>
                  <input
                    type="text"
                    value={withdrawForm.address}
                    onChange={e => setWithdrawForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Tari wallet address"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Importo (MYZ)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={withdrawForm.amount}
                    onChange={e => setWithdrawForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={withdrawing}
                    className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 disabled:opacity-50 text-sm font-medium"
                  >
                    {withdrawing ? 'Elaborazione...' : 'Prelievo'}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default WalletDashboard;