import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api';
import { useAlert } from '../context/AlertContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import GoogleAuthButton from '../components/GoogleAuthButton.jsx';
import { usePageTitle } from '../utils.js';

export default function Login() {
  usePageTitle('Log into your account');
  const { login } = useAuth();
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const location = useLocation();
  const googleError =
    new URLSearchParams(location.search).get('oauth') === 'google_error';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      showAlert('success', 'Logged in successfully!');
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      showAlert('error', errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <main className="main">
      <div className="auth-layout">
      <div className="login-form">
        <h2 className="heading-secondary ma-bt-lg">Welcome back</h2>
        {googleError && (
          <p className="google-auth__error" role="alert">
            Google sign-in could not be completed. Please try again.
          </p>
        )}
        <form className="form form--login" onSubmit={handleSubmit}>
          <div className="form__group">
            <label className="form__label" htmlFor="email">Email address</label>
            <input
              id="email"
              className="form__input"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="form__group ma-bt-md">
            <label className="form__label" htmlFor="password">Password</label>
            <input
              id="password"
              className="form__input"
              type="password"
              placeholder="••••••••"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div className="form__group">
            <button className="btn btn--green" disabled={busy}>
              {busy ? 'Logging in...' : 'Login'}
            </button>
          </div>
          <p className="form__link">
            <Link to="/forgot-password">Forgot your password?</Link>
            {' · '}
            <Link to="/signup">Create an account</Link>
          </p>
        </form>
        <GoogleAuthButton />
      </div>
      <aside className="auth-panel">
        <h3>Your next yatra is waiting.</h3>
        <p>Log in to book tours, manage trips, and pick up where you left off.</p>
      </aside>
      </div>
    </main>
  );
}
