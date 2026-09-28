import React, { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, CalendarDays, ShieldCheck, Sparkles } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { AlertModal } from '../../components/Modals';
import { DialogFrame, FormField } from '../../components/UI';
import PortalBrand from '../../components/PortalBrand';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', isError: false });
  const [resetting, setResetting] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const baseURL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'We could not sign you in. Check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setResetting(true);
    try {
      await axios.post(`${baseURL}/api/auth/forgot-password`, { email: forgotEmail });
      setShowForgotModal(false);
      setForgotEmail('');
      setAlertModal({ isOpen: true, title: 'Password reset requested', message: 'If the email exists, a new temporary password has been sent to it.', isError: false });
    } catch (err) {
      setAlertModal({ isOpen: true, title: 'Could not reset password', message: err.response?.data?.detail || 'Please try again.', isError: true });
    } finally {
      setResetting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-story-panel">
        <div className="auth-story-inner">
          <PortalBrand portal="University Portal" />
          <div className="auth-story-copy">
            <span className="auth-kicker"><Sparkles size={15} /> CAMPUS LIFE, CONNECTED</span>
            <h1>Make every campus moment count.</h1>
            <p>Discover events, connect with university clubs, and keep all your campus experiences in one place.</p>
            <div className="auth-feature-list">
              <span><CalendarDays size={18} /> Find events that matter to you</span>
              <span><ShieldCheck size={18} /> One secure university account</span>
            </div>
          </div>
          <small className="auth-story-footer">Brainware University · Event Management Portal</small>
        </div>
        <div className="auth-decoration auth-decoration-one" />
        <div className="auth-decoration auth-decoration-two" />
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-card">
          <div className="auth-mobile-brand"><PortalBrand portal="University Portal" /></div>
          <span className="ui-eyebrow">WELCOME BACK</span>
          <h2>Sign in to your account</h2>
          <p className="auth-intro">Use your university credentials to continue.</p>

          {error && <div className="auth-error" id="login-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <FormField label="University email" id="login-email">
              <input id="login-email" className="input-glass" type="email" autoComplete="username" placeholder="name@brainwareuniversity.ac.in" value={email} onChange={(event) => setEmail(event.target.value)} required aria-describedby={error ? 'login-error' : undefined} />
            </FormField>
            <div className="ui-form-field">
              <div className="auth-label-row">
                <label htmlFor="login-password">Password</label>
                <button type="button" className="auth-text-button" onClick={() => setShowForgotModal(true)}>Forgot password?</button>
              </div>
              <input id="login-password" className="input-glass" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required aria-describedby={error ? 'login-error' : undefined} />
            </div>
            <button type="submit" className="btn-primary auth-submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'} {!submitting && <ArrowRight size={17} />}
            </button>
          </form>

          <p className="auth-switch">New to Brainware? <Link to="/signup">Create a student account</Link></p>
          <p className="auth-security-note"><ShieldCheck size={15} /> Your account is protected by university authentication.</p>
        </div>
      </section>

      {showForgotModal && (
        <DialogFrame title="Reset your password" onClose={() => setShowForgotModal(false)} className="auth-reset-dialog" initialFocus="input">
          <p className="ui-dialog-description">Enter your registered email and we’ll send a temporary password if the account exists.</p>
          <form onSubmit={handleForgotPassword}>
            <FormField label="University email" id="reset-email">
              <input id="reset-email" type="email" autoComplete="email" placeholder="name@brainwareuniversity.ac.in" required value={forgotEmail} onChange={(event) => setForgotEmail(event.target.value)} className="input-glass" />
            </FormField>
            <div className="ui-dialog-actions">
              <button type="button" onClick={() => setShowForgotModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" disabled={resetting}>{resetting ? 'Sending…' : 'Send reset'}</button>
            </div>
          </form>
        </DialogFrame>
      )}
      <AlertModal {...alertModal} onClose={() => setAlertModal((previous) => ({ ...previous, isOpen: false }))} />
    </main>
  );
};

export default Login;
