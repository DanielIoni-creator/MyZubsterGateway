import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthShell from '../components/auth/AuthShell';
import './auth.css';

const GitHub = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.5v-1.8c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 5 18.3 5.3 18.3 5.3c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
  </svg>
);
const Google = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1C3.3 21.3 7.3 24 12 24z" />
    <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.4-.4-2.7s.1-1.9.4-2.7V6.2H1.3C.5 7.8 0 9.3 0 12s.5 4.2 1.3 5.8l4-3.1z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.3 0 3.3 2.7 1.3 6.2l4 3.1C6.2 6.9 8.9 4.8 12 4.8z" />
  </svg>
);
const Telegram = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M21.9 4.3 18.6 20c-.3 1.2-.9 1.5-1.9.9l-5.2-3.8-2.5 2.4c-.3.3-.5.5-1 .5l.4-5.3 9.6-8.7c.4-.4-.1-.6-.6-.2L6.2 13.6l-5-1.6c-1.1-.3-1.1-.1-.2-.8L20.1 3c.8-.3 1.5.2 1.8 1.3z" />
  </svg>
);
const Eye = ({ off }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M3 3l18 18" />}
  </svg>
);

const scorePassword = (p) => {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 5);
};
const STRENGTH = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const score = scorePassword(form.password);

  const validate = () => {
    if (form.name.trim().length < 2) return 'Please enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email address.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (form.password !== form.confirm) return 'Passwords do not match.';
    if (!agree) return 'Please accept the terms to continue.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const v = validate();
    if (v) { setError(v); return; }
    setLoading(true);
    const result = await register({ name: form.name, email: form.email, password: form.password });
    setLoading(false);
    if (result.success) {
      navigate('/2fa-setup');
    } else {
      setError(result.error || 'Could not create your account.');
    }
  };

  return (
    <AuthShell>
      <div className="auth-card">
        <h2 className="auth-title">Create your account</h2>
        <p className="auth-sub">Join MyZubster to publish offers and earn in privacy.</p>

        {error && <div className="auth-banner">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="name">Full name</label>
            <input id="name" type="text" className="auth-input" placeholder="Satoshi N." value={form.name} onChange={set('name')} autoComplete="name" />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="email">Email</label>
            <input id="email" type="email" className="auth-input" placeholder="you@example.com" value={form.email} onChange={set('email')} autoComplete="email" />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">Password</label>
            <div className="auth-pw-wrap">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                className="auth-input"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={set('password')}
                autoComplete="new-password"
              />
              <button type="button" className="auth-pw-toggle" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                <Eye off={showPw} />
              </button>
            </div>
            {form.password && (
              <>
                <div className={`auth-strength s${score}`} aria-hidden="true">
                  <span /><span /><span /><span /><span />
                </div>
                <div className="auth-strength-label">Strength: {STRENGTH[score]}</div>
              </>
            )}
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              type={showPw ? 'text' : 'password'}
              className="auth-input"
              placeholder="Re-enter password"
              value={form.confirm}
              onChange={set('confirm')}
              autoComplete="new-password"
            />
          </div>

          <div className="auth-row" style={{ marginBottom: 18 }}>
            <label className="auth-check">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              I agree to the Terms &amp; Privacy Policy
            </label>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="auth-divider">or sign up with</div>
        <div className="auth-social">
          <a className="auth-social-btn github" href="/api/auth/github"><GitHub /> GitHub</a>
          <a className="auth-social-btn google" href="/api/auth/google"><Google /> Google</a>
          <a className="auth-social-btn telegram" href="/api/auth/telegram"><Telegram /> Telegram</a>
        </div>

        <p className="auth-foot">Already have an account? <Link to="/login" className="auth-link">Sign in</Link></p>
      </div>
    </AuthShell>
  );
};

export default Register;
