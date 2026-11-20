import { ArrowLeft, ArrowRight, Check, LockKeyhole, Mail, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAppData } from '../hooks/useAppData.jsx';
import { Brand, Button, Field } from '../components/ui.jsx';

const securityQuestions = {
  first_school: 'What was the name of your first school?',
  first_pet: 'What was the name of your first pet?',
  birth_city: 'In what city were you born?',
  favorite_teacher: 'What was the name of a favorite teacher?',
};

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
          <h2>{mode === 'signup' ? 'A home for every little moment.' : mode === 'recovery' ? 'A secure way back to your memories.' : 'Good to have you back.'}</h2>
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
        securityQuestion: form.get('securityQuestion'),
        securityAnswer: form.get('securityAnswer'),
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
        <label className="field" htmlFor="signup-security-question">
          <span className="field__label">Security question</span>
          <select className="field__input" id="signup-security-question" name="securityQuestion" defaultValue="" required>
            <option value="" disabled>Choose a security question</option>
            {Object.entries(securityQuestions).map(([id, question]) => <option value={id} key={id}>{question}</option>)}
          </select>
        </label>
        <Field label="Security answer" id="signup-security-answer" name="securityAnswer" placeholder="Enter an answer you’ll remember" autoComplete="off" maxLength="200" required />
        <p className="field__hint">Your answer is hashed and is not case-sensitive. Avoid answers that are easy to guess.</p>
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
  const location = useLocation();
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
      {location.state?.passwordReset && <p className="auth-success" role="status">Your password has been reset. Log in with your new password.</p>}
      <form className="auth-form" onSubmit={submit}>
        <Field label="Email address" id="login-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
        <Field label="Password" id="login-password" name="password" type="password" placeholder="Enter your password" autoComplete="current-password" required />
        {(error || sessionError) && <p className="form-error" role="alert">{error || sessionError}</p>}
        <Button type="submit" className="auth-submit" disabled={submitting}>{submitting ? 'Logging in…' : 'Log in'} {!submitting && <ArrowRight size={16} />}</Button>
      </form>
      <Link className="forgot-password-link" to="/forgot-password">Forgot password?</Link>
      <p className="auth-switch">New to Frame? <Link to="/signup">Create an account</Link></p>
      <p className="auth-privacy"><Mail size={13} /> Your account stays in sync across your devices.</p>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [question, setQuestion] = useState('');
  const [lookupComplete, setLookupComplete] = useState(false);
  const [answer, setAnswer] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function findQuestion(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setLookupComplete(false);
    try {
      const result = await api.post('/auth/password-reset/question', { email });
      setQuestion(result.question);
      setLookupComplete(true);
    } catch (issue) {
      setQuestion('');
      setLookupComplete(false);
      setError(issue.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyAnswer(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const result = await api.post('/auth/password-reset/verify', { email, answer });
      setResetToken(result.resetToken);
    } catch (issue) {
      setError(issue.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function saveNewPassword(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = form.get('password');
    const confirmation = form.get('confirmPassword');
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.post('/auth/password-reset/reset', { resetToken, password });
      navigate('/login', { replace: true, state: { passwordReset: true } });
    } catch (issue) {
      setError(issue.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout mode="recovery">
      <Link className="back-link" to="/login"><ArrowLeft size={15} /> Back to login</Link>
      <span className="eyebrow auth-eyebrow">ACCOUNT RECOVERY</span>
      <h1>Reset your password</h1>
      <p className="auth-subtitle">Answer your security question to choose a new password.</p>
      {!question && (
        <form className="auth-form" onSubmit={findQuestion}>
          <Field label="Email address" id="recovery-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" required />
          {lookupComplete && <p className="recovery-unavailable" role="status">If this account can be recovered, its security question will be shown. If no question appears, contact your administrator for help.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <Button type="submit" className="auth-submit" disabled={submitting} aria-busy={submitting}>{submitting ? 'Checking…' : 'Continue'} {!submitting && <ArrowRight size={16} />}</Button>
        </form>
      )}
      {question && !resetToken && (
        <form className="auth-form" onSubmit={verifyAnswer}>
          <p className="security-question">{question}</p>
          <Field label="Your answer" id="recovery-answer" autoComplete="off" maxLength="200" value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Enter your answer" required />
          <p className="field__hint">Answers are not case-sensitive.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <Button type="submit" className="auth-submit" disabled={submitting} aria-busy={submitting}>{submitting ? 'Checking answer…' : 'Verify answer'} {!submitting && <ArrowRight size={16} />}</Button>
          <button type="button" className="recovery-change-email" onClick={() => { setQuestion(''); setAnswer(''); setError(''); }}>Use a different email address</button>
        </form>
      )}
      {resetToken && (
        <form className="auth-form" onSubmit={saveNewPassword}>
          <Field label="New password" id="recovery-password" name="password" type="password" autoComplete="new-password" minLength="8" maxLength="128" placeholder="At least 8 characters" required />
          <Field label="Confirm new password" id="recovery-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength="8" maxLength="128" placeholder="Enter your new password again" required />
          {error && <p className="form-error" role="alert">{error}</p>}
          <Button type="submit" className="auth-submit" disabled={submitting} aria-busy={submitting}>{submitting ? 'Updating password…' : 'Set new password'} {!submitting && <Check size={16} />}</Button>
        </form>
      )}
      <p className="auth-privacy"><LockKeyhole size={13} /> Recovery answers are stored securely.</p>
    </AuthLayout>
  );
}
