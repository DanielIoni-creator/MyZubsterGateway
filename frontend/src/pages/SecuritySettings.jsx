import React, { useState } from 'react';
import './SecuritySettings.css';

const DEFAULT_LIMITS = {
  daily: 500,
  perTransaction: 100,
  withdrawLimit: 250
};

const DEFAULT_RULES = {
  loginAlert: true,
  withdrawAlert: true,
  newDeviceAlert: true
};

const SecuritySettings = () => {
  const [tab, setTab] = useState('2fa');

  // ----- 2FA state -----
  const [twoFA, setTwoFA] = useState(true);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [secret] = useState('MZBR 7K2P Q7X9 L4MZ');
  const [codeError, setCodeError] = useState('');

  // ----- Whitelist state -----
  const [whitelist, setWhitelist] = useState([
    { id: 1, address: 'MZ...r7kQ92m', label: 'Wallet principale', active: true },
    { id: 2, address: 'XMR...4f8aB21n', label: 'Risparmi Monero', active: true }
  ]);
  const [newAddr, setNewAddr] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [addrError, setAddrError] = useState('');

  // ----- Limits state -----
  const [limits, setLimits] = useState(DEFAULT_LIMITS);
  const [limitsSaved, setLimitsSaved] = useState(false);

  // ----- Notifications state -----
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [notifSaved, setNotifSaved] = useState(false);

  // ===== 2FA handlers =====
  const handleDigit = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) {
      document.getElementById(`code-${i + 1}`)?.focus();
    }
    setCodeError('');
  };

  const handlePaste = (e) => {
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (text) {
      const next = text.split('').concat(Array(6).fill('')).slice(0, 6);
      setDigits(next);
      e.preventDefault();
    }
  };

  const verifyCode = (e) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < 6) {
      setCodeError('Inserisci tutte e 6 le cifre.');
      return;
    }
    setTwoFA(true);
    setCodeError('');
  };

  // ===== Whitelist handlers =====
  const handlePasteAddr = (e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData('text') || '').trim();
    setNewAddr(text);
  };

  const addAddress = (e) => {
    e.preventDefault();
    const addr = newAddr.trim();
    if (addr.length < 8) {
      setAddrError('Indirizzo non valido (min. 8 caratteri).');
      return;
    }
    setWhitelist([...whitelist, {
      id: Date.now(),
      address: addr,
      label: newLabel.trim() || 'Indirizzo',
      active: true
    }]);
    setNewAddr('');
    setNewLabel('');
    setAddrError('');
  };

  const removeAddress = (id) => {
    setWhitelist(whitelist.filter((w) => w.id !== id));
  };

  const toggleAddress = (id) => {
    setWhitelist(whitelist.map((w) => (w.id === id ? { ...w, active: !w.active } : w)));
  };

  // ===== Limits handlers =====
  const updateLimit = (key, val) => {
    setLimits({ ...limits, [key]: Number(val) || 0 });
    setLimitsSaved(false);
  };

  const saveLimits = (e) => {
    e.preventDefault();
    setLimitsSaved(true);
    setTimeout(() => setLimitsSaved(false), 2500);
  };

  // ===== Notifications handlers =====
  const toggleRule = (key) => {
    setRules({ ...rules, [key]: !rules[key] });
    setNotifSaved(false);
  };

  const saveNotifs = (e) => {
    e.preventDefault();
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2500);
  };

  return (
    <div className="security-settings">
      <header className="security-header">
        <h1>🔐 Sicurezza &amp; Autenticazione</h1>
        <p>Proteggi il tuo portafoglio con più strati di sicurezza avanzata</p>
      </header>

      {/* ---------- Tabs ---------- */}
      <nav className="security-tabs">
        <button className={tab === '2fa' ? 'active' : ''} onClick={() => setTab('2fa')}>
          🔑 2FA
        </button>
        <button className={tab === 'whitelist' ? 'active' : ''} onClick={() => setTab('whitelist')}>
          🛡️ Whitelist indirizzi
        </button>
        <button className={tab === 'limits' ? 'active' : ''} onClick={() => setTab('limits')}>
          ⚖️ Limiti transazioni
        </button>
        <button className={tab === 'notif' ? 'active' : ''} onClick={() => setTab('notif')}>
          🔔 Notifiche sicurezza
        </button>
      </nav>

      {/* ---------- 2FA TAB ---------- */}
      {tab === '2fa' && (
        <section className="security-panel">
          <div className="panel-head">
            <div>
              <h2>Autenticazione a due fattori (TOTP)</h2>
              <p>Richiedi un codice a 6 cifre a ogni accesso per proteggere l'account.</p>
            </div>
            <span className={`status-badge ${twoFA ? 'on' : 'off'}`}>
              {twoFA ? '● Attivo' : '○ Disattivo'}
            </span>
          </div>

          {twoFA ? (
            <div className="senable-card">
              <div className="check-icon">✓</div>
              <h3>2FA è abilitato</h3>
              <p>Il tuo account è protetto da autenticazione a due fattori.</p>
              <button className="btn ghost" onClick={() => setTwoFA(false)}>Rigenera secret</button>
            </div>
          ) : (
            <div className="setup-card">
              <div className="qr-box">
                <span>Scansiona con<br />Authenticator</span>
              </div>
              <div className="secret-box">
                <span className="label">Chiave manuale</span>
                <code>{secret}</code>
              </div>

              {codeError && <div className="err-banner">{codeError}</div>}

              <form onSubmit={verifyCode}>
                <div className="code-row" onPaste={handlePaste}>
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      id={`code-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleDigit(i, e.target.value)}
                      aria-label={`Cifra ${i + 1}`}
                    />
                  ))}
                </div>
                <button type="submit" className="btn primary">Verifica &amp; abilita</button>
              </form>
            </div>
          )}
        </section>
      )}

      {/* ---------- WHITELIST TAB ---------- */}
      {tab === 'whitelist' && (
        <section className="security-panel">
          <div className="panel-head">
            <div>
              <h2>Whitelist indirizzi</h2>
              <p>Solo gli indirizzi autorizzati possono ricevere prelievi dal tuo portafoglio.</p>
            </div>
          </div>

          <div className="whitelist-list">
            {whitelist.length === 0 && (
              <div className="empty-state">Nessun indirizzo in whitelist.</div>
            )}
            {whitelist.map((w) => (
              <div className="whitelist-item" key={w.id}>
                <div className="wl-info">
                  <span className={`wl-dot ${w.active ? 'on' : 'off'}`} />
                  <div>
                    <strong>{w.label}</strong>
                    <code>{w.address}</code>
                  </div>
                </div>
                <div className="wl-actions">
                  <button className="btn ghost sm" onClick={() => toggleAddress(w.id)}>
                    {w.active ? 'Disattiva' : 'Attiva'}
                  </button>
                  <button className="btn danger sm" onClick={() => removeAddress(w.id)}>Rimuovi</button>
                </div>
              </div>
            ))}
          </div>

          <form className="add-addr" onSubmit={addAddress}>
            <h3>➕ Aggiungi indirizzo</h3>
            {addrError && <div className="err-banner">{addrError}</div>}
            <input
              type="text"
              placeholder="Etichetta (es. Risparmi)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <input
              type="text"
              placeholder="Indirizzo wallet"
              value={newAddr}
              onChange={(e) => setNewAddr(e.target.value)}
              onPaste={handlePasteAddr}
            />
            <button type="submit" className="btn primary">Aggiungi alla whitelist</button>
          </form>
        </section>
      )}

      {/* ---------- LIMITS TAB ---------- */}
      {tab === 'limits' && (
        <section className="security-panel">
          <div className="panel-head">
            <div>
              <h2>Limiti transazioni</h2>
              <p>Imposta limiti per proteggere il tuo saldo da movimenti anomali.</p>
            </div>
          </div>

          <form className="limits-form" onSubmit={saveLimits}>
            <div className="limit-row">
              <label>
                <span>Limite giornaliero</span>
                <div className="input-group">
                  <span className="currency">MYZ</span>
                  <input
                    type="number"
                    min="0"
                    value={limits.daily}
                    onChange={(e) => updateLimit('daily', e.target.value)}
                  />
                </div>
              </label>
            </div>
            <div className="limit-row">
              <label>
                <span>Limite per transazione</span>
                <div className="input-group">
                  <span className="currency">MYZ</span>
                  <input
                    type="number"
                    min="0"
                    value={limits.perTransaction}
                    onChange={(e) => updateLimit('perTransaction', e.target.value)}
                  />
                </div>
              </label>
            </div>
            <div className="limit-row">
              <label>
                <span>Limite prelievo</span>
                <div className="input-group">
                  <span className="currency">MYZ</span>
                  <input
                    type="number"
                    min="0"
                    value={limits.withdrawLimit}
                    onChange={(e) => updateLimit('withdrawLimit', e.target.value)}
                  />
                </div>
              </label>
            </div>
            <button type="submit" className="btn primary">Salva limiti</button>
            {limitsSaved && <div className="ok-banner">Limiti salvati ✓</div>}
          </form>
        </section>
      )}

      {/* ---------- NOTIFICATIONS TAB ---------- */}
      {tab === 'notif' && (
        <section className="security-panel">
          <div className="panel-head">
            <div>
              <h2>Notifiche di sicurezza</h2>
              <p>Ricevi avvisi immediati per attività sospette sul tuo account.</p>
            </div>
          </div>

          <form className="notif-form" onSubmit={saveNotifs}>
            <div className="notif-row">
              <div>
                <strong>Avviso di accesso</strong>
                <p>Notifica un nuovo accesso da un dispositivo o IP sconosciuto.</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={rules.loginAlert}
                  onChange={() => toggleRule('loginAlert')}
                />
                <span className="slider" />
              </label>
            </div>
            <div className="notif-row">
              <div>
                <strong>Avviso di prelievo</strong>
                <p>Notifica ogni prelievo superiore al limite impostato.</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={rules.withdrawAlert}
                  onChange={() => toggleRule('withdrawAlert')}
                />
                <span className="slider" />
              </label>
            </div>
            <div className="notif-row">
              <div>
                <strong>Nuovo dispositivo</strong>
                <p>Notifica quando un nuovo dispositivo viene collegato.</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={rules.newDeviceAlert}
                  onChange={() => toggleRule('newDeviceAlert')}
                />
                <span className="slider" />
              </label>
            </div>
            <button type="submit" className="btn primary">Salva preferenze</button>
            {notifSaved && <div className="ok-banner">Preferenze salvate ✓</div>}
          </form>
        </section>
      )}
    </div>
  );
};

export default SecuritySettings;