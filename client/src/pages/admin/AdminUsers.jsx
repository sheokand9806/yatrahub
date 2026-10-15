import { useMemo, useState } from 'react';
import api, { errorMessage } from '../../api';
import { AdminPage, LoadState, StatCard, useList } from '../../components/AdminUI.jsx';
import { useAlert } from '../../context/AlertContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatINR } from '../../utils.js';

const ROLES = ['user', 'guide', 'lead-guide', 'admin'];
const blank = { name: '', email: '', role: 'user', password: '' };

export default function AdminUsers() {
  const { user: me } = useAuth();
  const { showAlert } = useAlert();
  const { data, setData, error, loading, reload } = useList('/admin/users');
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const all = data || [];
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter(
      u => (role === 'all' || u.role === role) && (!s || u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s))
    );
  }, [all, q, role]);

  const changeRole = async (u, next) => {
    try {
      await api.patch(`/users/${u.id}`, { role: next });
      setData(list => list.map(x => (x.id === u.id ? { ...x, role: next } : x)));
      showAlert('success', `${u.name} is now ${next}.`);
    } catch (err) {
      showAlert('error', errorMessage(err));
    }
  };

  const remove = async u => {
    if (!window.confirm(`Deactivate ${u.name}? They will no longer be able to log in. Their bookings and reviews are kept.`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      setData(list => list.filter(x => x.id !== u.id));
      showAlert('success', 'User deactivated.');
    } catch (err) {
      showAlert('error', errorMessage(err));
    }
  };

  const create = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/users', form);
      showAlert('success', 'User created. Share the password with them securely.');
      setForm(blank);
      setAdding(false);
      reload();
    } catch (err) {
      showAlert('error', errorMessage(err));
    }
    setSaving(false);
  };

  const count = r => all.filter(u => u.role === r).length;

  return (
    <AdminPage
      title="Manage users"
      subtitle="Change roles, add team members or deactivate accounts."
      actions={<button className="btn btn--small btn--green" onClick={() => setAdding(a => !a)}>{adding ? 'Close' : '+ Add user'}</button>}
    >
      <div className="stat-grid">
        <StatCard label="All users" value={all.length} />
        <StatCard label="Customers" value={count('user')} />
        <StatCard label="Guides" value={count('guide') + count('lead-guide')} />
        <StatCard label="Admins" value={count('admin')} />
      </div>

      {adding && (
        <form className="admin-card form" onSubmit={create}>
          <h3 className="admin-card__title">New user</h3>
          <div className="form-grid">
            <div className="form__group"><label className="form__label">Name</label>
              <input className="form__input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="form__group"><label className="form__label">Email</label>
              <input className="form__input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="form__group"><label className="form__label">Role</label>
              <select className="form__input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select></div>
            <div className="form__group"><label className="form__label">Temporary password</label>
              <input className="form__input" type="text" required minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
          </div>
          <div className="form-actions"><button className="btn btn--small btn--green" disabled={saving}>{saving ? 'Creating…' : 'Create user'}</button></div>
        </form>
      )}

      <div className="admin-toolbar">
        <input className="form__input" placeholder="Search by name or email…" value={q} onChange={e => setQ(e.target.value)} />
        <select className="form__input" value={role} onChange={e => setRole(e.target.value)}>
          <option value="all">All roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <LoadState loading={loading} error={error} empty={data && rows.length === 0} emptyText="No users found." />

      {rows.length > 0 && (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>User</th><th>Role</th><th>Bookings</th><th className="right">Spent</th><th /></tr>
            </thead>
            <tbody>
              {rows.map(u => {
                const self = u.id === me.id;
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="cell-media">
                        <img className="round" src={`/img/users/${u.photo}`} alt="" />
                        <div><strong>{u.name}{self && ' (you)'}</strong><span className="admin-muted">{u.email}</span></div>
                      </div>
                    </td>
                    <td>
                      <select className="form__input form__input--compact" value={u.role} disabled={self} onChange={e => changeRole(u, e.target.value)}>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td>{u.bookings}</td>
                    <td className="right">{formatINR(u.spent)}</td>
                    <td className="row-actions">
                      {!self && <button className="btn btn--small btn--ghost btn--danger" onClick={() => remove(u)}>Deactivate</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminPage>
  );
}
