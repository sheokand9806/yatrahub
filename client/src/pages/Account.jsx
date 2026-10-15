import { useMemo, useState } from 'react';
import api, { errorMessage } from '../api';
import AccountNav from '../components/AccountNav.jsx';
import { useAlert } from '../context/AlertContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { usePageTitle } from '../utils.js';

export default function Account() {
  usePageTitle('Your account');
  const { user, setUser } = useAuth();
  const { showAlert } = useAlert();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [photo, setPhoto] = useState(null);
  const [savingData, setSavingData] = useState(false);
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);

  const [passwordCurrent, setPasswordCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const saveData = async e => {
    e.preventDefault();
    setSavingData(true);
    try {
      const form = new FormData();
      form.append('name', name);
      form.append('email', email);
      if (photo) form.append('photo', photo);
      const res = await api.patch('/users/updateMe', form);
      setUser(res.data.data.user);
      setPhoto(null);
      showAlert('success', 'DATA updated successfully!');
    } catch (err) {
      showAlert('error', errorMessage(err));
    }
    setSavingData(false);
  };

  const savePassword = async e => {
    e.preventDefault();
    setSavingPassword(true);
    try {
      await api.patch('/users/updateMyPassword', {
        passwordCurrent,
        password,
        passwordConfirm
      });
      showAlert('success', 'PASSWORD updated successfully!');
      setPasswordCurrent('');
      setPassword('');
      setPasswordConfirm('');
    } catch (err) {
      showAlert('error', errorMessage(err));
    }
    setSavingPassword(false);
  };

  return (
    <main className="main">
      <div className="user-view">
        <AccountNav />

        <div className="user-view__content">
          <div className="user-view__form-container">
            <h2 className="heading-secondary ma-bt-md">Profile</h2>
            <form className="form form-user-data" onSubmit={saveData}>
              <div className="form__group">
                <label className="form__label" htmlFor="name">Name</label>
                <input id="name" className="form__input" type="text" required value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="form__group ma-bt-md">
                <label className="form__label" htmlFor="email">Email address</label>
                <input id="email" className="form__input" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="form__group form__photo-upload">
                <img
                  className="form__user-photo"
                  src={preview || `/img/users/${user.photo}`}
                  alt="User"
                />
                <input
                  className="form__upload"
                  type="file"
                  accept="image/*"
                  id="photo"
                  name="photo"
                  onChange={e => setPhoto(e.target.files[0] || null)}
                />
                <label htmlFor="photo">Choose new photo</label>
              </div>
              <div className="form__group right">
                <button className="btn btn--small btn--green" disabled={savingData}>
                  {savingData ? 'Saving...' : 'Save settings'}
                </button>
              </div>
            </form>
          </div>

          <div className="line">&nbsp;</div>

          <div className="user-view__form-container">
            <h2 className="heading-secondary ma-bt-md">Password change</h2>
            <form className="form form-user-password" onSubmit={savePassword}>
              <div className="form__group">
                <label className="form__label" htmlFor="password-current">Current password</label>
                <input id="password-current" className="form__input" type="password" placeholder="••••••••" required minLength={8} value={passwordCurrent} onChange={e => setPasswordCurrent(e.target.value)} />
              </div>
              <div className="form__group">
                <label className="form__label" htmlFor="password">New password</label>
                <input id="password" className="form__input" type="password" placeholder="••••••••" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div className="form__group ma-bt-lg">
                <label className="form__label" htmlFor="password-confirm">Confirm password</label>
                <input id="password-confirm" className="form__input" type="password" placeholder="••••••••" required minLength={8} value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} />
              </div>
              <div className="form__group right">
                <button className="btn btn--small btn--green btn--save-password" disabled={savingPassword}>
                  {savingPassword ? 'Updating...' : 'Save password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
