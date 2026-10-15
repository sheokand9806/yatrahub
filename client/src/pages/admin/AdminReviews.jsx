import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../api';
import { AdminPage, LoadState, StatCard, Stars, useList } from '../../components/AdminUI.jsx';
import { useAlert } from '../../context/AlertContext.jsx';
import { formatDate } from '../../utils.js';

export default function AdminReviews() {
  const { showAlert } = useAlert();
  const { data, setData, error, loading } = useList('/admin/reviews');
  const [q, setQ] = useState('');
  const [stars, setStars] = useState('all');

  const all = data || [];
  const avg = all.length ? all.reduce((s, r) => s + (r.rating || 0), 0) / all.length : 0;
  const dist = [5, 4, 3, 2, 1].map(n => ({ n, count: all.filter(r => r.rating === n).length }));

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter(
      r =>
        (stars === 'all' || r.rating === Number(stars)) &&
        (!s || [r.user?.name, r.tour?.name, r.review].filter(Boolean).some(v => v.toLowerCase().includes(s)))
    );
  }, [all, q, stars]);

  const remove = async r => {
    if (!window.confirm('Delete this review? This also updates the tour rating.')) return;
    try {
      await api.delete(`/reviews/${r.id}`);
      setData(list => list.filter(x => x.id !== r.id));
      showAlert('success', 'Review deleted.');
    } catch (err) {
      showAlert('error', errorMessage(err));
    }
  };

  return (
    <AdminPage title="Manage reviews" subtitle="Read what travellers say and remove anything inappropriate.">
      <div className="admin-two-col admin-two-col--narrow">
        <div className="stat-grid stat-grid--stack">
          <StatCard label="Total reviews" value={all.length} />
          <StatCard label="Average rating" value={all.length ? `${avg.toFixed(1)} / 5` : '—'} />
        </div>
        <section className="admin-card">
          <h3 className="admin-card__title">Rating breakdown</h3>
          {dist.map(d => (
            <div className="dist-row" key={d.n}>
              <span>{d.n} ★</span>
              <div className="dist-row__track"><div style={{ width: `${all.length ? (d.count / all.length) * 100 : 0}%` }} /></div>
              <span className="admin-muted">{d.count}</span>
            </div>
          ))}
        </section>
      </div>

      <div className="admin-toolbar">
        <input className="form__input" placeholder="Search by traveller, tour or text…" value={q} onChange={e => setQ(e.target.value)} />
        <select className="form__input" value={stars} onChange={e => setStars(e.target.value)}>
          <option value="all">All ratings</option>
          {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} stars</option>)}
        </select>
      </div>

      <LoadState loading={loading} error={error} empty={data && rows.length === 0} emptyText="No reviews found." />

      {rows.map(r => (
        <article className="account-item" key={r.id}>
          {r.user && <img className="account-item__avatar" src={`/img/users/${r.user.photo}`} alt="" />}
          <div className="account-item__body">
            <h3 className="account-item__title">
              {r.user?.name || 'Deleted user'}
              <span className="admin-muted"> on </span>
              {r.tour ? <Link to={`/tour/${r.tour.slug}`}>{r.tour.name}</Link> : 'a deleted tour'}
            </h3>
            <span className="account-item__meta">{formatDate(r.createdAt)}</span>
            <Stars value={r.rating} />
            <p className="account-item__text">{r.review}</p>
          </div>
          <button className="btn btn--small btn--ghost btn--danger" onClick={() => remove(r)}>Delete</button>
        </article>
      ))}
    </AdminPage>
  );
}
