import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api';
import { useAlert } from '../context/AlertContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import GoogleAuthButton from '../components/GoogleAuthButton.jsx';
import { usePageTitle } from '../utils.js';

export default function Signup() {
  usePageTitle('Create your account');
  const { signup } = useAuth();
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirm: ''
  });
  const [busy, setBusy] = useState(false);

  const set = key => e => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      await signup(form);
      showAlert('success', 'Account created! Welcome to YatraHub.');
      navigate('/', { replace: true });
    } catch (err) {
      showAlert('error', errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <main className="main">
      <div className="auth-layout">
      <div className="login-form">
        <h2 className="heading-secondary ma-bt-lg">Create your account</h2>
        <form className="form form--signup" onSubmit={handleSubmit}>
          <div className="form__group">
            <label className="form__label" htmlFor="name">Your name</label>
            <input id="name" className="form__input" type="text" placeholder="Your name" required value={form.name} onChange={set('name')} />
          </div>
          <div className="form__group">
            <label className="form__label" htmlFor="email">Email address</label>
            <input id="email" className="form__input" type="email" placeholder="you@example.com" required value={form.email} onChange={set('email')} />
          </div>
          <div className="form__group">
            <label className="form__label" htmlFor="password">Password</label>
            <input id="password" className="form__input" type="password" placeholder="••••••••" required minLength={8} value={form.password} onChange={set('password')} />
          </div>
          <div className="form__group ma-bt-md">
            <label className="form__label" htmlFor="passwordConfirm">Confirm password</label>
            <input id="passwordConfirm" className="form__input" type="password" placeholder="••••••••" required minLength={8} value={form.passwordConfirm} onChange={set('passwordConfirm')} />
          </div>
          <div className="form__group">
            <button className="btn btn--green btn--signup" disabled={busy}>
              {busy ? 'Creating...' : 'Sign up'}
            </button>
          </div>
          <p className="form__link">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </form>
        <GoogleAuthButton />
      </div>
      <aside className="auth-panel">
        <h3>Join a community of curious travellers.</h3>
        <p>One account for bookings, itineraries, and trip memories across India.</p>
      </aside>
      </div>
    </main>
  );
}
