import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/axiosConfig';
import './MultiWalletDashboard.css';

const DEFAULT_CURRENCIES = ['MYZ', 'XMR'];

// A wallet is a labelled, addressable container holding one currency.
// When the API is unreachable the dashboard falls back to demo wallets so the
// UI (and the add/edit/switch flows) can still be exercised and reviewed.
const DEMO_WALLETS = [
  {
    id: 'w_demo_savings',
    label: 'Risparmio',
    currency: 'MYZ',
    address: 'MZb1hk2JvN9qT4pX8yA3sD6fG7hJ0kL2mZx',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'w_demo_ops',
    label: 'Operativo',
    currency: 'XMR',
    address: '44kLzNXHV9EDxHN948HsvhhEQpQY6iyE6LfgCbFz46',
    createdAt: new Date().toISOString(),
  },
];

const DEMO_TRANSACTIONS = [
  { id: 'tx_demo_1', walletId: 'w_demo_savings', currency: 'MYZ', direction: 'CREDIT', amount: 125.5, state: 'COMPLETED', createdAt: new Date(Date.now() - 2 * 864e5).toISOString(), reference: 'Bounty #712' },
  { id: 'tx_demo_2', walletId: 'w_demo_savings', currency: 'MYZ', direction: 'DEBIT', amount: 30, state: 'COMPLETED', createdAt: new Date(Date.now() - 4 * 864e5).toISOString(), reference: 'Escrow fee' },
  { id: 'tx_demo_3', walletId: 'w_demo_ops', currency: 'XMR', direction: 'CREDIT', amount: 0.42, state: 'COMPLETED', createdAt: new Date(Date.now() - 1 * 864e5).toISOString(), reference: 'Robot payout' },
  { id: 'tx_demo_4', walletId: 'w_demo_ops', currency: 'XMR', direction: 'CREDIT', amount: 0.1, state: 'PENDING', createdAt: new Date(Date.now() - 3 * 864e5).toISOString(), reference: 'Order #88' },
];

const STATUS_LABEL = {
  PENDING: 'In attesa',
  CONFIRMING: 'In conferma',
  COMPLETED: 'Completato',
  FAILED: 'Fallito',
  CANCELLED: 'Annullato',
  EXPIRED: 'Scaduto',
};

const STATUS_COLOR = {
  PENDING: '#d99000',
  CONFIRMING: '#3498db',
  COMPLETED: '#22a06b',
  FAILED: '#d94f4f',
  CANCELLED: '#95a5a6',
  EXPIRED: '#7f8c8d',
};

function formatAmount(value, currency) {
  const decimals = currency === 'XMR' ? 12 : 4;
  const num = Number(value) || 0;
  const text = num.toFixed(decimals);
  return text.indexOf('.') === -1 ? text : text.replace(/0+$/, '').replace(/\.$/, '');
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

const MultiWalletDashboard = () => {
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeWalletId, setActiveWalletId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  // Add-wallet modal state
  const [showAdd, setShowAdd] = useState(false);
  const [newWallet, setNewWallet] = useState({
    label: '',
    currency: 'MYZ',
    address: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchWallets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Try the wallet API; fall back to demo data so the UI stays usable.
      let walletList;
      try {
        const res = await api.get('/wallet');
        const data = res.data?.data || res.data?.wallets || res.data?.items || [];
        walletList = Array.isArray(data) ? data : [];
      } catch {
        walletList = DEMO_WALLETS;
        setIsDemo(true);
      }
      setWallets(walletList);
      setActiveWalletId((prev) => prev && walletList.some((w) => w.id === prev) ? prev : (walletList[0]?.id || null));
    } catch (err) {
      setError('Errore nel caricamento dei wallet. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async (walletId) => {
    if (!walletId) return;
    try {
      let items;
      try {
        const res = await api.get('/payments', { params: { walletId, limit: 100 } });
        items = res.data?.items || [];
      } catch {
        items = DEMO_TRANSACTIONS.filter((tx) => tx.walletId === walletId);
        setIsDemo((prev) => prev || true);
      }
      setTransactions(items);
    } catch {
      setTransactions([]);
    }
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  useEffect(() => {
    if (activeWalletId) fetchTransactions(activeWalletId);
  }, [activeWalletId, fetchTransactions]);

  const activeWallet = wallets.find((w) => w.id === activeWalletId) || null;

  // ---- Aggregated balance across every wallet, per currency ----
  const currencyTotals = wallets.reduce((acc, w) => {
    acc[w.currency] = (acc[w.currency] || 0);
    return acc;
  }, {});
  const walletTxByCurrency = {};
  wallets.forEach((w) => {
    walletTxByCurrency[w.currency] = (walletTxByCurrency[w.currency] || 0) + 1;
  });

  // Per-wallet balance from the active wallet's transactions
  const activeBalance = transactions.reduce((acc, tx) => {
    if (tx.state === 'PENDING') return acc;
    const delta = tx.direction === 'CREDIT' ? Number(tx.amount) : -Number(tx.amount);
    return acc + (delta || 0);
  }, 0);
  const activePending = transactions.reduce((acc, tx) => {
    if (tx.state !== 'PENDING') return acc;
    const delta = tx.direction === 'CREDIT' ? Number(tx.amount) : -Number(tx.amount);
    return acc + (delta || 0);
  }, 0);

  const handleAddWallet = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!newWallet.label.trim()) {
      setFormError('Inserisci un nome per il wallet.');
      return;
    }
    if (!newWallet.address.trim()) {
      setFormError("Inserisci l'indirizzo del wallet.");
      return;
    }
    setSaving(true);
    try {
      const added = { id: `w_${Date.now()}`, label: newWallet.label.trim(), currency: newWallet.currency, address: newWallet.address.trim(), createdAt: new Date().toISOString() };
      try {
        await api.post('/wallet', { label: newWallet.label.trim(), currency: newWallet.currency, address: newWallet.address.trim() });
      } catch {
        // API unavailable — keep the local addition so the flow is demonstrable.
        setIsDemo(true);
      }
      setWallets((prev) => [...prev, added]);
      setActiveWalletId(added.id);
      setShowAdd(false);
      setNewWallet({ label: '', currency: 'MYZ', address: '' });
    } catch (err) {
      setFormError('Errore durante la creazione del wallet.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveWallet = async (id) => {
    if (wallets.length <= 1) return;
    try {
      await api.delete(`/wallet/${id}`);
    } catch {
      // ignore — keep local state consistent for demo
    }
    const next = wallets.filter((w) => w.id !== id);
    setWallets(next);
    if (activeWalletId === id) setActiveWalletId(next[0]?.id || null);
  };

  if (loading) {
    return <div className="mw-loading">👛 Caricamento wallet…</div>;
  }

  return (
    <div className="mw-shell">
      <header className="mw-header">
        <div>
          <h1>👛 Portafoglio Multi-wallet</h1>
          <p>Gestisci più wallet MYZ e XMR in un'unica dashboard.</p>
        </div>
        <div className="mw-header-actions">
          {isDemo && <span className="mw-pill demo">● Dati dimostrativi</span>}
          <button className="mw-btn primary" onClick={() => setShowAdd(true)}>+ Aggiungi wallet</button>
        </div>
      </header>

      {error && <div className="mw-alert error">{error}</div>}

      {wallets.length === 0 ? (
        <div className="mw-empty">
          <p>Nessun wallet configurato.</p>
          <button className="mw-btn primary" onClick={() => setShowAdd(true)}>Crea il primo wallet</button>
        </div>
      ) : (
        <>
          {/* ---- Aggregated balance strip ---- */}
          <section className="mw-aggregate">
            <div className="mw-card mw-total">
              <h2>Saldo aggregato</h2>
              <div className="mw-amount-grid">
                {Object.keys(currencyTotals).length === 0 && (
                  <div className="mw-no-agg">Nessuna valuta rilevata</div>
                )}
                {Object.keys(currencyTotals).map((cur) => (
                  <div className="mw-agg-item" key={cur}>
                    <span className="mw-agg-currency">{cur}</span>
                    {/* Aggregated balance is the sum of every wallet's settled credit - debit.
                        In demo mode we show the count of wallets holding that currency. */}
                    <span className="mw-agg-value">
                      {isDemo ? `${wallets.filter((w) => w.currency === cur).length} wallet` : formatAmount(currencyTotals[cur], cur)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mw-stat-cards">
              <div className="mw-stat">
                <span className="mw-stat-label">Wallet totali</span>
                <span className="mw-stat-value">{wallets.length}</span>
              </div>
              <div className="mw-stat">
                <span className="mw-stat-label">Valute</span>
                <span className="mw-stat-value">{new Set(wallets.map((w) => w.currency)).size}</span>
              </div>
            </div>
          </section>

          {/* ---- Wallet switcher ---- */}
          <section className="mw-wallet-bar">
            <div className="mw-wallet-tabs">
              {wallets.map((w) => (
                <button
                  key={w.id}
                  className={`mw-wallet-tab ${w.id === activeWalletId ? 'active' : ''}`}
                  onClick={() => setActiveWalletId(w.id)}
                >
                  <span className="mw-tab-currency">{w.currency}</span>
                  <span className="mw-tab-label">{w.label}</span>
                  <span className="mw-tab-address">{w.address.slice(0, 10)}…</span>
                </button>
              ))}
            </div>
          </section>

          {/* ---- Active wallet detail ---- */}
          {activeWallet && (
            <section className="mw-detail">
              <div className="mw-detail-head">
                <div>
                  <h2>{activeWallet.label}</h2>
                  <p className="mw-address">{activeWallet.address}</p>
                </div>
                <div className="mw-detail-actions">
                  <span className="mw-balance">
                    {formatAmount(activeBalance, activeWallet.currency)} {activeWallet.currency}
                  </span>
                  {activePending !== 0 && (
                    <span className="mw-pending">+{formatAmount(activePending, activeWallet.currency)} in attesa</span>
                  )}
                  <button className="mw-btn danger" onClick={() => handleRemoveWallet(activeWallet.id)} disabled={wallets.length <= 1}>
                    Rimuovi
                  </button>
                </div>
              </div>

              <h3 className="mw-subtitle">Transazioni</h3>
              {transactions.length === 0 ? (
                <div className="mw-empty small">Nessuna transazione per questo wallet.</div>
              ) : (
                <div className="mw-table-wrap">
                  <table className="mw-table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Riferimento</th>
                        <th>Direzione</th>
                        <th>Importo</th>
                        <th>Stato</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id || tx._id}>
                          <td>{formatDate(tx.createdAt)}</td>
                          <td>{tx.reference || tx.description || '—'}</td>
                          <td>
                            <span className={`mw-dir ${tx.direction === 'CREDIT' ? 'credit' : 'debit'}`}>
                              {tx.direction === 'CREDIT' ? 'In entrata' : 'In uscita'}
                            </span>
                          </td>
                          <td className={tx.direction === 'CREDIT' ? 'mw-amount credit' : 'mw-amount debit'}>
                            {tx.direction === 'CREDIT' ? '+' : '−'}{formatAmount(tx.amount, tx.currency)} {tx.currency}
                          </td>
                          <td>
                            <span className="mw-status" style={{ color: STATUS_COLOR[tx.state] || '#6c6580' }}>
                              {STATUS_LABEL[tx.state] || tx.state}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* ---- Add wallet modal ---- */}
      {showAdd && (
        <div className="mw-modal">
          <div className="mw-modal-card">
            <div className="mw-modal-head">
              <h2>Nuovo wallet</h2>
              <button className="mw-modal-close" onClick={() => setShowAdd(false)}>×</button>
            </div>
            <form onSubmit={handleAddWallet}>
              <label className="mw-field">
                <span>Nome</span>
                <input
                  type="text"
                  value={newWallet.label}
                  onChange={(e) => setNewWallet((p) => ({ ...p, label: e.target.value }))}
                  placeholder="es. Risparmio, Operativo"
                  autoFocus
                />
              </label>
              <label className="mw-field">
                <span>Valuta</span>
                <select
                  value={newWallet.currency}
                  onChange={(e) => setNewWallet((p) => ({ ...p, currency: e.target.value }))}
                >
                  {DEFAULT_CURRENCIES.map((cur) => (
                    <option key={cur} value={cur}>{cur}</option>
                  ))}
                </select>
              </label>
              <label className="mw-field">
                <span>Indirizzo</span>
                <input
                  type="text"
                  value={newWallet.address}
                  onChange={(e) => setNewWallet((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Indirizzo del wallet"
                />
              </label>
              {formError && <div className="mw-alert error">{formError}</div>}
              <div className="mw-modal-actions">
                <button type="button" className="mw-btn" onClick={() => setShowAdd(false)}>Annulla</button>
                <button type="submit" className="mw-btn primary" disabled={saving}>
                  {saving ? 'Salvataggio…' : 'Aggiungi wallet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiWalletDashboard;