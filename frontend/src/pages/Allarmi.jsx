import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/axiosConfig';
import './Allarmi.css';

// Default alarm rules
const DEFAULT_RULES = [
  {
    id: '1',
    name: 'Pagamento ricevuto',
    description: 'Notifica quando viene ricevuto un nuovo pagamento',
    icon: '📥',
    enabled: true,
    channel: { email: true, sms: false, telegram: true },
    threshold: { type: 'none', value: 0 },
    severity: 'info',
  },
  {
    id: '2',
    name: 'Pagamento fallito',
    description: 'Notifica quando un pagamento va in stato FAILED',
    icon: '❌',
    enabled: true,
    channel: { email: true, sms: true, telegram: true },
    threshold: { type: 'none', value: 0 },
    severity: 'critical',
  },
  {
    id: '3',
    name: 'Pagamento in attesa',
    description: 'Notifica quando un pagamento rimane in attesa oltre la soglia',
    icon: '⏳',
    enabled: true,
    channel: { email: false, sms: false, telegram: true },
    threshold: { type: 'time', value: 30, unit: 'minuti' },
    severity: 'warning',
  },
  {
    id: '4',
    name: 'Importo elevato',
    description: 'Notifica per pagamenti superiori a una soglia importo',
    icon: '💰',
    enabled: true,
    channel: { email: true, sms: true, telegram: true },
    threshold: { type: 'amount', value: 1000, unit: 'MYZ' },
    severity: 'warning',
  },
  {
    id: '5',
    name: 'Superamento limite giornaliero',
    description: 'Notifica quando il totale giornaliero supera la soglia',
    icon: '📈',
    enabled: false,
    channel: { email: true, sms: false, telegram: false },
    threshold: { type: 'amount', value: 5000, unit: 'MYZ' },
    severity: 'critical',
  },
  {
    id: '6',
    name: 'Cambio valuta',
    description: 'Notifica per transazioni in valuta diversa da MYZ o XMR',
    icon: '🔄',
    enabled: false,
    channel: { email: false, sms: false, telegram: true },
    threshold: { type: 'none', value: 0 },
    severity: 'info',
  },
];

const SEVERITY_MAP = {
  critical: { label: 'Critico', color: '#e74c3c' },
  warning: { label: 'Avviso', color: '#f39c12' },
  info: { label: 'Info', color: '#3498db' },
};

const STATUS_MAP = {
  active: { label: 'Attivo', color: '#e74c3c' },
  acknowledged: { label: 'Riconosciuto', color: '#f39c12' },
  resolved: { label: 'Risolto', color: '#27ae60' },
};

const Allarmi = () => {
  // Alarm rules state
  const [rules, setRules] = useState(() => {
    const saved = localStorage.getItem('allarmi_rules');
    return saved ? JSON.parse(saved) : DEFAULT_RULES;
  });

  // Alarm history (from API or local)
  const [alarmHistory, setAlarmHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [editingRule, setEditingRule] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Fetch alarm history from payment API
  const fetchAlarmHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/payments', { params: { limit: 50 } });
      const data = res.data;
      const items = data.items || [];

      // Generate alarm-like records from payment data
      const history = [];
      items.forEach((p) => {
        if (p.status === 'FAILED' || p.status === 'EXPIRED') {
          history.push({
            id: `alarm-${p.id}-fail`,
            type: 'pagamento_fallito',
            severity: 'critical',
            message: `Pagamento ${p.amount} ${p.currency} fallito`,
            status: p.status === 'FAILED' ? 'active' : 'resolved',
            date: p.createdAt,
            paymentId: p.id,
            amount: p.amount,
            currency: p.currency,
          });
        }
        if (p.status === 'PENDING') {
          history.push({
            id: `alarm-${p.id}-pending`,
            type: 'pagamento_in_attesa',
            severity: 'warning',
            message: `Pagamento ${p.amount} ${p.currency} in attesa`,
            status: 'active',
            date: p.createdAt,
            paymentId: p.id,
            amount: p.amount,
            currency: p.currency,
          });
        }
        if (p.status === 'COMPLETED') {
          const amount = Number(p.amount) || 0;
          // Check if amount exceeds threshold
          const highAmountRule = rules.find(
            (r) => r.id === '4' && r.enabled && r.threshold.type === 'amount'
          );
          if (highAmountRule && amount >= highAmountRule.threshold.value) {
            history.push({
              id: `alarm-${p.id}-high`,
              type: 'importo_elevato',
              severity: 'warning',
              message: `Pagamento elevato: ${p.amount} ${p.currency}`,
              status: 'acknowledged',
              date: p.createdAt,
              paymentId: p.id,
              amount: p.amount,
              currency: p.currency,
            });
          }
        }
      });

      // Sort by date (newest first)
      history.sort((a, b) => new Date(b.date) - new Date(a.date));
      setAlarmHistory(history);
    } catch (err) {
      console.error('Error fetching alarm data:', err);
      setError('Errore nel caricamento degli allarmi. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  }, [rules]);

  useEffect(() => {
    fetchAlarmHistory();
  }, [fetchAlarmHistory]);

  // Save rules to localStorage
  useEffect(() => {
    localStorage.setItem('allarmi_rules', JSON.stringify(rules));
  }, [rules]);

  // Toggle alarm enabled/disabled
  const toggleRule = (ruleId) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  // Open edit modal
  const openEditModal = (rule) => {
    setEditingRule({ ...rule });
    setShowModal(true);
  };

  // Close edit modal
  const closeModal = () => {
    setEditingRule(null);
    setShowModal(false);
  };

  // Save edited rule
  const saveRule = () => {
    if (!editingRule) return;
    setRules((prev) =>
      prev.map((r) => (r.id === editingRule.id ? editingRule : r))
    );
    closeModal();
  };

  // Handle channel toggle in edit modal
  const toggleChannel = (channel) => {
    setEditingRule((prev) => ({
      ...prev,
      channel: { ...prev.channel, [channel]: !prev.channel[channel] },
    }));
  };

  // Acknowledge an alarm
  const acknowledgeAlarm = (alarmId) => {
    setAlarmHistory((prev) =>
      prev.map((a) =>
        a.id === alarmId ? { ...a, status: 'acknowledged' } : a
      )
    );
  };

  // Resolve an alarm
  const resolveAlarm = (alarmId) => {
    setAlarmHistory((prev) =>
      prev.map((a) => (a.id === alarmId ? { ...a, status: 'resolved' } : a))
    );
  };

  // Stats
  const activeRules = rules.filter((r) => r.enabled).length;
  const triggeredAlarms = alarmHistory.filter((a) => a.status === 'active').length;
  const totalAlarms = alarmHistory.length;

  if (loading && alarmHistory.length === 0) {
    return (
      <div className="allarmi-page">
        <div className="loading">⏳ Caricamento allarmi...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="allarmi-page">
        <div className="error-message">⚠️ {error}</div>
      </div>
    );
  }

  return (
    <div className="allarmi-page">
      <header className="allarmi-header">
        <h1>🔔 Allarmi e Notifiche</h1>
        <p>Sistema di notifiche configurabili per pagamenti e transazioni</p>
      </header>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-active">
          <div className="stat-icon">🔔</div>
          <div className="stat-value">{activeRules}</div>
          <div className="stat-label">Allarmi attivi</div>
        </div>
        <div className="stat-card stat-triggered">
          <div className="stat-icon">⚡</div>
          <div className="stat-value">{triggeredAlarms}</div>
          <div className="stat-label">Allarmi in corso</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-value">{totalAlarms}</div>
          <div className="stat-label">Totale storico</div>
        </div>
        <div className="stat-card stat-disabled">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{rules.length - activeRules}</div>
          <div className="stat-label">Allarmi disattivati</div>
        </div>
      </div>

      {/* Alarm Rules */}
      <div className="section">
        <div className="section-header">
          <h2>⚙️ Regole allarme configurabili</h2>
          <span className="badge">{rules.length} regole</span>
        </div>
        <ul className="alarm-rules">
          {rules.map((rule) => (
            <li key={rule.id} className="alarm-rule">
              <div className="alarm-rule-icon">{rule.icon}</div>
              <div className="alarm-rule-info">
                <h3>{rule.name}</h3>
                <p>{rule.description}</p>
                <div className="rule-meta">
                  <span className="meta-tag">
                    {SEVERITY_MAP[rule.severity]?.label || rule.severity}
                  </span>
                  {rule.threshold.type !== 'none' && (
                    <span className="meta-tag">
                      Soglia: {rule.threshold.value}
                      {rule.threshold.unit ? ` ${rule.threshold.unit}` : ''}
                    </span>
                  )}
                  <span className="meta-tag">
                    {['email', 'sms', 'telegram']
                      .filter((ch) => rule.channel[ch])
                      .map((ch) => ch === 'telegram' ? '📱 Telegram' : ch === 'email' ? '📧 Email' : '💬 SMS')
                      .join(', ')}
                  </span>
                </div>
              </div>
              <div className="alarm-rule-actions">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => toggleRule(rule.id)}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <button
                  className="btn-edit"
                  onClick={() => openEditModal(rule)}
                >
                  ✏️ Modifica
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Alarm History */}
      <div className="section">
        <div className="section-header">
          <h2>📋 Storico allarmi</h2>
          <span className="badge">{totalAlarms} eventi</span>
        </div>
        {alarmHistory.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <p>Nessun allarme attivo. Tutti i pagamenti sono regolari.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="alarm-table">
              <thead>
                <tr>
                  <th>Severità</th>
                  <th>Messaggio</th>
                  <th>Importo</th>
                  <th>Stato</th>
                  <th>Data</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {alarmHistory.map((alarm) => (
                  <tr key={alarm.id}>
                    <td>
                      <span className={`alarm-severity ${alarm.severity}`}>
                        {SEVERITY_MAP[alarm.severity]?.label || alarm.severity}
                      </span>
                    </td>
                    <td>{alarm.message}</td>
                    <td>
                      {alarm.amount} {alarm.currency}
                    </td>
                    <td>
                      <span className={`alarm-status ${alarm.status}`}>
                        {STATUS_MAP[alarm.status]?.label || alarm.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>
                      {alarm.date
                        ? new Date(alarm.date).toLocaleString('it-IT')
                        : '-'}
                    </td>
                    <td>
                      {alarm.status === 'active' && (
                        <button
                          className="btn-edit"
                          onClick={() => acknowledgeAlarm(alarm.id)}
                          title="Riconosci"
                        >
                          👁️
                        </button>
                      )}
                      {alarm.status !== 'resolved' && (
                        <button
                          className="btn-edit"
                          onClick={() => resolveAlarm(alarm.id)}
                          title="Risolvi"
                          style={{ marginLeft: 4 }}
                        >
                          ✅
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showModal && editingRule && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>✏️ Modifica regola: {editingRule.name}</h2>

            <div className="form-group">
              <label>Nome regola</label>
              <input
                type="text"
                value={editingRule.name}
                onChange={(e) =>
                  setEditingRule((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="form-group">
              <label>Descrizione</label>
              <textarea
                value={editingRule.description}
                onChange={(e) =>
                  setEditingRule((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            <div className="form-group">
              <label>Severità</label>
              <select
                value={editingRule.severity}
                onChange={(e) =>
                  setEditingRule((prev) => ({
                    ...prev,
                    severity: e.target.value,
                  }))
                }
              >
                <option value="info">Info</option>
                <option value="warning">Avviso</option>
                <option value="critical">Critico</option>
              </select>
            </div>

            <div className="form-group">
              <label>Canali di notifica</label>
              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editingRule.channel.email}
                    onChange={() => toggleChannel('email')}
                  />
                  📧 Email
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={editingRule.channel.sms}
                    onChange={() => toggleChannel('sms')}
                  />
                  💬 SMS
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={editingRule.channel.telegram}
                    onChange={() => toggleChannel('telegram')}
                  />
                  📱 Telegram
                </label>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Tipo soglia</label>
                <select
                  value={editingRule.threshold.type}
                  onChange={(e) =>
                    setEditingRule((prev) => ({
                      ...prev,
                      threshold: { type: e.target.value, value: 0, unit: '' },
                    }))
                  }
                >
                  <option value="none">Nessuna soglia</option>
                  <option value="amount">Importo</option>
                  <option value="time">Tempo</option>
                  <option value="count">Conteggio</option>
                </select>
              </div>
              {editingRule.threshold.type !== 'none' && (
                <div className="form-group">
                  <label>Valore soglia</label>
                  <input
                    type="number"
                    value={editingRule.threshold.value}
                    onChange={(e) =>
                      setEditingRule((prev) => ({
                        ...prev,
                        threshold: {
                          ...prev.threshold,
                          value: Number(e.target.value),
                        },
                      }))
                    }
                  />
                </div>
              )}
              {editingRule.threshold.type === 'time' && (
                <div className="form-group">
                  <label>Unità</label>
                  <select
                    value={editingRule.threshold.unit}
                    onChange={(e) =>
                      setEditingRule((prev) => ({
                        ...prev,
                        threshold: { ...prev.threshold, unit: e.target.value },
                      }))
                    }
                  >
                    <option value="minuti">Minuti</option>
                    <option value="ore">Ore</option>
                    <option value="giorni">Giorni</option>
                  </select>
                </div>
              )}
              {editingRule.threshold.type === 'amount' && (
                <div className="form-group">
                  <label>Valuta</label>
                  <select
                    value={editingRule.threshold.unit}
                    onChange={(e) =>
                      setEditingRule((prev) => ({
                        ...prev,
                        threshold: { ...prev.threshold, unit: e.target.value },
                      }))
                    }
                  >
                    <option value="MYZ">MYZ</option>
                    <option value="XMR">XMR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button className="btn-secondary" onClick={closeModal}>
                Annulla
              </button>
              <button className="btn-primary" onClick={saveRule}>
                💾 Salva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Allarmi;