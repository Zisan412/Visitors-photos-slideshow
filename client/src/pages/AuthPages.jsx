import { ArrowLeft, ArrowRight, Check, LockKeyhole, Mail, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAppData } from '../hooks/useAppData.jsx';
import { Brand, Button, Field } from '../components/ui.jsx';

function AuthLayout({ children, mode }) {
  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <Brand />
        <div className="auth-content">{children}</div>
        <span className="auth-footnote">© 2026 Frame. Made for the moments that matter.</span>
      </section>
      <aside className="auth-aside">
        <div className="auth-aside__image" />
        <div className="auth-aside__content">
          <span className="eyebrow"><Sparkles size={14} /> YOUR MOMENTS, BEAUTIFULLY KEPT</span>
          <h2>{mode === 'signup' ? 'A home for every little moment.' : 'Good to have you back.'}</h2>
          <p>Bring your favorite photos together and let them tell your story, one frame at a time.</p>
          <div className="auth-aside__dots"><i /><i /><i /></div>
        </div>
      </aside>
    </main>
  );
}

export function SignupPage() {
  const { setUser, sessionError, clearSessionError } = useAppData();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!form.get('consent')) {
      setError('Please confirm how your photos are stored.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await api.post('/auth/signup', {
        name: form.get('name'),
        email: form.get('email'),
        password: form.get('password'),
      });
      setUser(result.user);
      clearSessionError();
      navigate('/dashboard');
    } catch (issue) {
      setError(issue.message);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <AuthLayout mode="signup">
      <Link className="back-link" to="/login"><ArrowLeft size={15} /> Back to login</Link>
      <span className="eyebrow auth-eyebrow">GET STARTED — IT’S FREE</span>
      <h1>Create your account</h1>
      <p className="auth-subtitle">A little space for all the photos you love.</p>
      <form className="auth-form" onSubmit={submit}>
        <Field label="Full name" id="signup-name" name="name" placeholder="How should we call you?" autoComplete="name" required />
        <Field label="Email address" id="signup-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
        <Field label="Password" id="signup-password" name="password" type="password" placeholder="At least 8 characters" autoComplete="new-password" minLength="8" required />
        <label className="consent"><input type="checkbox" name="consent" /><span><i><Check size={12} /></i> I understand that photos I upload are stored and managed in my account.</span></label>
        {(error || sessionError) && <p className="form-error" role="alert">{error || sessionError}</p>}
        <Button type="submit" className="auth-submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account'} {!submitting && <ArrowRight size={16} />}</Button>
      </form>
      <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
      <p className="auth-privacy"><LockKeyhole size={13} /> Your details stay private and secure.</p>
    </AuthLayout>
  );
}

export function LoginPage() {
  const { setUser, sessionError, clearSessionError } = useAppData();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError('');
    try {
      const result = await api.post('/auth/login', {
        email: form.get('email'),
        password: form.get('password'),
      });
      setUser(result.user);
      clearSessionError();
      navigate('/dashboard');
    } catch (issue) {
      setError(issue.message);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <AuthLayout mode="login">
      <Link className="back-link" to="/signup"><ArrowLeft size={15} /> Create an account</Link>
      <span className="eyebrow auth-eyebrow">WELCOME BACK</span>
      <h1>Log in to Frame</h1>
      <p className="auth-subtitle">Your photos are right where you left them.</p>
      <form className="auth-form" onSubmit={submit}>
        <Field label="Email address" id="login-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
        <Field label="Password" id="login-password" name="password" type="password" placeholder="Enter your password" autoComplete="current-password" required />
        {(error || sessionError) && <p className="form-error" role="alert">{error || sessionError}</p>}
        <Button type="submit" className="auth-submit" disabled={submitting}>{submitting ? 'Logging in…' : 'Log in'} {!submitting && <ArrowRight size={16} />}</Button>
      </form>
      <p className="auth-switch">New to Frame? <Link to="/signup">Create an account</Link></p>
      <p className="auth-privacy"><Mail size={13} /> Your account stays in sync across your devices.</p>
    </AuthLayout>
  );
}
