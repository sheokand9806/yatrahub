import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../api';
import { AdminPage, LoadState, useList } from '../../components/AdminUI.jsx';
import { useAlert } from '../../context/AlertContext.jsx';
import { formatDate, formatINR } from '../../utils.js';

export default function AdminTours() {
  const { showAlert } = useAlert();
  const { data, setData, error, loading } = useList('/admin/tours');
  const [q, setQ] = useState('');
  const [diff, setDiff] = useState('all');

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data || []).filter(
      t =>
        (diff === 'all' || t.difficulty === diff) &&
        (!s || t.name.toLowerCase().includes(s) || (t.startLocation || '').toLowerCase().includes(s))
    );
  }, [data, q, diff]);

  const remove = async tour => {
    const extra = tour.bookings ? ` It has ${tour.bookings} booking(s); those payment records are kept.` : '';
    if (!window.confirm(`Delete "${tour.name}" and its reviews?${extra} This cannot be undone.`)) return;
    try {
      await api.delete(`/tours/${tour.id}`);
      setData(list => list.filter(t => t.id !== tour.id));
      showAlert('success', 'Tour deleted.');
    } catch (err) {
      showAlert('error', errorMessage(err));
    }
  };

  return (
    <AdminPage
      title="Manage tours"
      subtitle="Create, edit and remove the tours customers can book."
      actions={<Link to="/admin/tours/new" className="btn btn--green btn--small">+ New tour</Link>}
    >
      <div className="admin-toolbar">
        <input className="form__input" placeholder="Search by name or location…" value={q} onChange={e => setQ(e.target.value)} />
        <select className="form__input" value={diff} onChange={e => setDiff(e.target.value)}>
          <option value="all">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="difficult">Difficult</option>
        </select>
      </div>

      <LoadState loading={loading} error={error} empty={data && rows.length === 0} emptyText="No tours found." />

      {rows.length > 0 && (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tour</th><th>Price</th><th>Duration</th><th>Difficulty</th><th>Rating</th>
                <th>Next date</th><th>Bookings</th><th className="right">Revenue</th><th />
              </tr>
            </thead>
            <tbody>
              {rows.map(t => (
                <tr key={t.id}>
                  <td>
                    <div className="cell-media">
                      <img src={`/img/tours/${t.imageCover}`} alt="" />
                      <div>
                        <Link to={`/tour/${t.slug}`} className="admin-link"><strong>{t.name}</strong></Link>
                        <span className="admin-muted">{t.startLocation || '—'}</span>
                      </div>
                    </div>
                  </td>
                  <td>{formatINR(t.price)}</td>
                  <td>{t.duration} days</td>
                  <td className="cap">{t.difficulty}</td>
                  <td>{t.ratingsAverage} <span className="admin-muted">({t.ratingsQuantity})</span></td>
                  <td>{formatDate(t.nextDate)}</td>
                  <td>{t.bookings}</td>
                  <td className="right">{formatINR(t.revenue)}</td>
                  <td className="row-actions">
                    <Link to={`/admin/tours/${t.id}/edit`} className="btn btn--small btn--ghost">Edit</Link>
                    <button className="btn btn--small btn--ghost btn--danger" onClick={() => remove(t)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPage>
  );
}
