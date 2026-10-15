import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../api';
import { AdminPage, LoadState, Pill, StatCard, useList } from '../../components/AdminUI.jsx';
import { useAlert } from '../../context/AlertContext.jsx';
import { downloadCSV, formatDateTime, formatINR } from '../../utils.js';

export default function AdminBookings() {
  const { showAlert } = useAlert();
  const { data, setData, error, loading } = useList('/admin/bookings');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [open, setOpen] = useState(null);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data || []).filter(b => {
      if (status === 'paid' && !b.paid) return false;
      if (status === 'pending' && b.paid) return false;
      if (!s) return true;
      return [b.user?.name, b.user?.email, b.tour?.name, b.paymentId, b.orderId]
        .filter(Boolean)
        .some(v => v.toLowerCase().includes(s));
    });
  }, [data, q, status]);

  const revenue = rows.filter(b => b.paid).reduce((s, b) => s + b.price, 0);
  const customers = new Set(rows.map(b => b.user?.id).filter(Boolean)).size;

  const remove = async b => {
    if (!window.confirm(`Delete this booking by ${b.user?.name || 'a deleted user'}? The customer will lose access to it.`)) return;
    try {
      await api.delete(`/bookings/${b.id}`);
      setData(list => list.filter(x => x.id !== b.id));
      showAlert('success', 'Booking deleted.');
    } catch (err) {
      showAlert('error', errorMessage(err));
    }
  };

  const exportCsv = () =>
    downloadCSV('bookings.csv', [
      ['Date', 'Customer', 'Email', 'Tour', 'Amount (INR)', 'Status', 'Payment ID', 'Order ID'],
      ...rows.map(b => [
        formatDateTime(b.createdAt), b.user?.name, b.user?.email, b.tour?.name,
        b.price, b.paid ? 'Paid' : 'Pending', b.paymentId, b.orderId
      ])
    ]);

  return (
    <AdminPage
      title="Manage bookings"
      subtitle="Every booking made on the site. Click a row for full details."
      actions={<button className="btn btn--small btn--ghost" onClick={exportCsv} disabled={!rows.length}>Export CSV</button>}
    >
      <div className="stat-grid">
        <StatCard label="Bookings" value={rows.length} note={rows.length !== (data || []).length ? 'matching filters' : 'all time'} />
        <StatCard label="Revenue" value={formatINR(revenue)} note="paid only" />
        <StatCard label="Average booking" value={formatINR(rows.length ? revenue / rows.length : 0)} />
        <StatCard label="Customers" value={customers} />
      </div>

      <div className="admin-toolbar">
        <input className="form__input" placeholder="Search customer, email, tour or payment ID…" value={q} onChange={e => setQ(e.target.value)} />
        <select className="form__input" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <LoadState loading={loading} error={error} empty={data && rows.length === 0} emptyText="No bookings found." />

      {rows.length > 0 && (
        <div className="table-wrap">
          <table className="admin-table admin-table--click">
            <thead>
              <tr><th>Date</th><th>Customer</th><th>Tour</th><th>Status</th><th className="right">Amount</th><th /></tr>
            </thead>
            <tbody>
              {rows.map(b => (
                <Fragment key={b.id}>
                  <tr onClick={() => setOpen(open === b.id ? null : b.id)} className={open === b.id ? 'is-open' : ''}>
                    <td>{formatDateTime(b.createdAt)}</td>
                    <td>
                      <div className="cell-media">
                        {b.user && <img className="round" src={`/img/users/${b.user.photo}`} alt="" />}
                        <div>
                          <strong>{b.user?.name || 'Deleted user'}</strong>
                          <span className="admin-muted">{b.user?.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{b.tour?.name || 'Deleted tour'}</td>
                    <td><Pill tone={b.paid ? 'ok' : 'warn'}>{b.paid ? 'Paid' : 'Pending'}</Pill></td>
                    <td className="right">{formatINR(b.price)}</td>
                    <td className="row-actions">
                      <button className="btn btn--small btn--ghost btn--danger" onClick={e => { e.stopPropagation(); remove(b); }}>Delete</button>
                    </td>
                  </tr>
                  {open === b.id && (
                    <tr className="detail-row">
                      <td colSpan={6}>
                        <dl className="detail-grid">
                          <div><dt>Booking ID</dt><dd>{b.id}</dd></div>
                          <div><dt>Booked on</dt><dd>{formatDateTime(b.createdAt)}</dd></div>
                          <div><dt>Payment ID</dt><dd>{b.paymentId || '—'}</dd></div>
                          <div><dt>Order ID</dt><dd>{b.orderId || '—'}</dd></div>
                          <div><dt>Customer</dt><dd>{b.user ? `${b.user.name} · ${b.user.email}` : 'Deleted user'}</dd></div>
                          <div><dt>Tour</dt><dd>{b.tour ? <Link to={`/tour/${b.tour.slug}`} className="admin-link">{b.tour.name}</Link> : 'Deleted tour'}</dd></div>
                        </dl>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPage>
  );
}
