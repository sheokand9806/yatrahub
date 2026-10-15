import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../api';
import { AdminPage, LoadState, Pill, StatCard } from '../../components/AdminUI.jsx';
import { formatDateTime, formatINR } from '../../utils.js';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/admin/stats')
      .then(res => setStats(res.data.data))
      .catch(err => setError(errorMessage(err)));
  }, []);

  if (!stats)
    return (
      <AdminPage title="Dashboard" subtitle="How YatraHub is doing">
        <LoadState loading={!error} error={error} />
      </AdminPage>
    );

  const max = Math.max(1, ...stats.months.map(m => m.revenue));

  return (
    <AdminPage title="Dashboard" subtitle="How YatraHub is doing">
      <div className="stat-grid">
        <StatCard label="Revenue" value={formatINR(stats.revenue)} note="from paid bookings" />
        <StatCard label="Bookings" value={stats.bookings} note="all time" />
        <StatCard label="Tours" value={stats.tours} note="live on the site" />
        <StatCard label="Users" value={stats.users} note="active accounts" />
        <StatCard
          label="Reviews"
          value={stats.reviews}
          note={stats.avgRating ? `${stats.avgRating} / 5 average` : 'no ratings yet'}
        />
      </div>

      <div className="admin-two-col">
        <section className="admin-card">
          <h3 className="admin-card__title">Revenue, last 6 months</h3>
          <div className="bars">
            {stats.months.map(m => (
              <div className="bars__col" key={`${m.year}-${m.label}`} title={`${m.bookings} bookings`}>
                <span className="bars__value">{m.revenue ? formatINR(m.revenue) : ''}</span>
                <div className="bars__track">
                  <div className="bars__bar" style={{ height: `${(m.revenue / max) * 100}%` }} />
                </div>
                <span className="bars__label">{m.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-card">
          <h3 className="admin-card__title">Top tours by revenue</h3>
          {stats.topTours.length === 0 && <p className="admin-muted">No bookings yet.</p>}
          <ol className="top-list">
            {stats.topTours.map(t => (
              <li key={t._id || t.name}>
                {t.slug ? <Link to={`/tour/${t.slug}`}>{t.name}</Link> : <span>{t.name || 'Deleted tour'}</span>}
                <span className="admin-muted">{t.bookings} booking{t.bookings === 1 ? '' : 's'}</span>
                <strong>{formatINR(t.revenue)}</strong>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="admin-card">
        <div className="admin-card__row">
          <h3 className="admin-card__title">Recent bookings</h3>
          <Link to="/admin/bookings" className="admin-link">View all</Link>
        </div>
        {stats.recentBookings.length === 0 && <p className="admin-muted">No bookings yet.</p>}
        {stats.recentBookings.length > 0 && (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Customer</th><th>Tour</th><th>Date</th><th>Status</th><th className="right">Amount</th></tr>
              </thead>
              <tbody>
                {stats.recentBookings.map(b => (
                  <tr key={b.id}>
                    <td>{b.user?.name || 'Deleted user'}</td>
                    <td>{b.tour?.name || 'Deleted tour'}</td>
                    <td>{formatDateTime(b.createdAt)}</td>
                    <td><Pill tone={b.paid ? 'ok' : 'warn'}>{b.paid ? 'Paid' : 'Pending'}</Pill></td>
                    <td className="right">{formatINR(b.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminPage>
  );
}
