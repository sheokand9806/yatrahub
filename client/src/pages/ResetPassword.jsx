import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useAlert } from '../context/AlertContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { usePageTitle } from '../utils.js';

export default function ResetPassword() {
  usePageTitle('Reset password');
  const { token } = useParams();
  const { refresh } = useAuth();
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.patch(`/users/resetPassword/${token}`, { password, passwordConfirm });
      await refresh();
      showAlert('success', 'Password updated. You are now logged in!');
      navigate('/', { replace: true });
    } catch (err) {
      showAlert('error', errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <main className="main">
      <div className="login-form">
        <h2 className="heading-secondary ma-bt-lg">Choose a new password</h2>
        <form className="form" onSubmit={handleSubmit}>
          <div className="form__group">
            <label className="form__label" htmlFor="password">New password</label>
            <input id="password" className="form__input" type="password" placeholder="••••••••" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div className="form__group ma-bt-md">
            <label className="form__label" htmlFor="passwordConfirm">Confirm password</label>
            <input id="passwordConfirm" className="form__input" type="password" placeholder="••••••••" required minLength={8} value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} />
          </div>
          <div className="form__group">
            <button className="btn btn--green" disabled={busy}>
              {busy ? 'Saving...' : 'Save new password'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
