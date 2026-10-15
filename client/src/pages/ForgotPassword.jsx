import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useAlert } from '../context/AlertContext.jsx';
import { usePageTitle } from '../utils.js';

export default function ForgotPassword() {
  usePageTitle('Forgot password');
  const { showAlert } = useAlert();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/users/forgotPassword', { email });
      showAlert('success', 'Reset link sent! Please check your email.');
    } catch (err) {
      showAlert('error', errorMessage(err));
    }
    setBusy(false);
  };

  return (
    <main className="main">
      <div className="login-form">
        <h2 className="heading-secondary ma-bt-lg">Forgot your password?</h2>
        <form className="form" onSubmit={handleSubmit}>
          <div className="form__group ma-bt-md">
            <label className="form__label" htmlFor="email">Email address</label>
            <input id="email" className="form__input" type="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="form__group">
            <button className="btn btn--green" disabled={busy}>
              {busy ? 'Sending...' : 'Send reset link'}
            </button>
          </div>
          <p className="form__link">
            <Link to="/login">Back to login</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
