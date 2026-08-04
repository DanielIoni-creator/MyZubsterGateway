import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../components/auth/AuthShell';
import './auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    // UI-only flow: a real backend would trigger the reset email here.
    setSent(true);
  };

  return (
    <AuthShell>
      <div className="auth-card">
        {!sent ? (
          <>
            <h2 className="auth-title">Reset your password</h2>
            <p className="auth-sub">Enter the email linked to your account and we'll send a reset link.</p>
            {error && <div className="auth-banner">{error}</div>}
            <form onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label className="auth-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="auth-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <button type="submit" className="auth-submit">Send reset link</button>
            </form>
            <p className="auth-foot"><Link to="/login" className="auth-link">Back to sign in</Link></p>
          </>
        ) : (
          <>
            <h2 className="auth-title">Check your inbox</h2>
            <p className="auth-sub">
              If an account exists for <b>{email}</b>, a password reset link is on its way. The link expires in 30 minutes.
            </p>
            <div className="auth-banner ok">Reset email sent (demo).</div>
            <p className="auth-foot"><Link to="/login" className="auth-link">Return to sign in</Link></p>
          </>
        )}
      </div>
    </AuthShell>
  );
};

export default ForgotPassword;
