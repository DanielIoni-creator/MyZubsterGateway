import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../components/auth/AuthShell';
import './auth.css';

const SECRET = 'MZBR 7K2P Q7X9 L4MZ';

const TwoFactorSetup = () => {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const refs = useRef([]);

  const focus = (i) => refs.current[i] && refs.current[i].focus();

  const handleChange = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    setError('');
    if (v && i < 5) focus(i + 1);
  };

  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) focus(i - 1);
  };

  const handlePaste = (e) => {
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (text) {
      const next = text.split('').concat(Array(6).fill('')).slice(0, 6);
      setDigits(next);
      focus(Math.min(text.length, 5));
      e.preventDefault();
    }
  };

  const verify = (e) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < 6) {
      setError('Please enter all 6 digits from your authenticator app.');
      return;
    }
    // UI-only flow: a real backend would validate the TOTP code here.
    setDone(true);
  };

  return (
    <AuthShell>
      <div className="auth-card">
        {!done ? (
          <>
            <h2 className="auth-title">Set up two-factor auth</h2>
            <p className="auth-sub">Strengthen your account. Scan the code with an authenticator app, then enter the 6-digit code.</p>

            <div className="auth-2fa-qr"><span>Scan with<br />Authenticator</span></div>
            <div className="auth-label" style={{ marginTop: 6 }}>Manual entry key</div>
            <div className="auth-2fa-secret">{SECRET}</div>

            {error && <div className="auth-banner" style={{ marginTop: 16 }}>{error}</div>}

            <form onSubmit={verify}>
              <div className="auth-code" onPaste={handlePaste}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (refs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKey(i, e)}
                    aria-label={`Digit ${i + 1}`}
                  />
                ))}
              </div>
              <button type="submit" className="auth-submit" style={{ marginTop: 22 }}>Verify &amp; enable</button>
            </form>
            <p className="auth-foot"><Link to="/login" className="auth-link">Skip for now</Link></p>
          </>
        ) : (
          <>
            <h2 className="auth-title">You're all set</h2>
            <p className="auth-sub">Two-factor authentication is now enabled for your account. You'll be asked for a code at every sign-in.</p>
            <div className="auth-banner ok">2FA enabled (demo).</div>
            <p className="auth-foot"><Link to="/login" className="auth-link">Continue to sign in</Link></p>
          </>
        )}
      </div>
    </AuthShell>
  );
};

export default TwoFactorSetup;
