import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import AccountNav from '../components/AccountNav.jsx';
import { Pill, StatCard } from '../components/AdminUI.jsx';
import { useAlert } from '../context/AlertContext.jsx';
import { formatDate, formatDateTime, formatINR, usePageTitle } from '../utils.js';

export default function MyTours() {
  usePageTitle('My bookings');
  const { showAlert } = useAlert();
  const [params, setParams] = useSearchParams();
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.get('alert') === 'booking') {
      showAlert(
        'success',
        "Your booking was successful! Please check your email for a confirmation. If your booking doesn't show up here immediately, please come back later.",
        20
      );
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api
      .get('/bookings/my-bookings')
      .then(res => setBookings(res.data.data.data))
      .catch(err => setError(errorMessage(err)));
  }, []);

  const summary = useMemo(() => {
    const list = bookings || [];
    const next = list
      .map(b => b.tour?.startDates?.[0])
      .filter(d => d && new Date(d) > new Date())
      .sort((a, b) => new Date(a) - new Date(b))[0];
    return {
      count: list.length,
      spent: list.filter(b => b.paid).reduce((s, b) => s + b.price, 0),
      next
    };
  }, [bookings]);

  return (
    <main className="main">
      <div className="user-view user-view--wide">
        <AccountNav />
        <div className="user-view__content admin-content">
          <div className="admin-head">
            <div>
              <h2 className="heading-secondary">My bookings</h2>
              <p className="admin-head__sub">Every trip you’ve booked, with payment details.</p>
            </div>
          </div>

          {error && <div className="loading-box">{error}</div>}
          {!error && !bookings && <div className="loading-box">Loading your bookings…</div>}

          {bookings && (
            <>
              <div className="stat-grid">
                <StatCard label="Total bookings" value={summary.count} />
                <StatCard label="Total spent" value={formatINR(summary.spent)} />
                <StatCard label="Next trip" value={summary.next ? formatDate(summary.next) : '—'} />
              </div>

              {bookings.length === 0 && (
                <div className="loading-box">You have not booked any tours yet. <Link to="/" className="admin-link">Browse tours</Link></div>
              )}

              {bookings.map(b => (
                <article className="account-item" key={b.id}>
                  {b.tour && <img className="account-item__img" src={`/img/tours/${b.tour.imageCover}`} alt="" />}
                  <div className="account-item__body">
                    <h3 className="account-item__title">
                      {b.tour ? <Link to={`/tour/${b.tour.slug}`}>{b.tour.name}</Link> : 'Deleted tour'}
                    </h3>
                    <span className="account-item__meta">Booked on {formatDateTime(b.createdAt)}</span>
                    <dl className="detail-grid detail-grid--tight">
                      {b.tour && <div><dt>Starts</dt><dd>{formatDate(b.tour.startDates?.[0])}</dd></div>}
                      {b.tour && <div><dt>Duration</dt><dd>{b.tour.duration} days</dd></div>}
                      {b.tour?.startLocation?.description && <div><dt>Meeting point</dt><dd>{b.tour.startLocation.description}</dd></div>}
                      <div><dt>Amount</dt><dd>{formatINR(b.price)}</dd></div>
                      <div><dt>Status</dt><dd><Pill tone={b.paid ? 'ok' : 'warn'}>{b.paid ? 'Paid' : 'Pending'}</Pill></dd></div>
                      {b.paymentId && <div><dt>Payment ID</dt><dd>{b.paymentId}</dd></div>}
                    </dl>
                  </div>
                </article>
              ))}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
