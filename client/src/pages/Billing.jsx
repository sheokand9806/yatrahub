import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api';
import AccountNav from '../components/AccountNav.jsx';
import { formatINR, usePageTitle } from '../utils.js';

const dateFmt = d =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Billing() {
  usePageTitle('Billing');
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/bookings/my-bookings')
      .then(res => setBookings(res.data.data.data))
      .catch(err => setError(errorMessage(err)));
  }, []);

  const total = (bookings || []).filter(b => b.paid).reduce((s, b) => s + b.price, 0);

  return (
    <main className="main">
      <div className="user-view">
        <AccountNav />
        <div className="user-view__content">
          <div className="user-view__form-container">
            <h2 className="heading-secondary ma-bt-md">Billing</h2>
            {error && <div className="loading-box">{error}</div>}
            {!error && !bookings && <div className="loading-box">Loading payments…</div>}
            {bookings && bookings.length === 0 && (
              <div className="loading-box">No payments yet. <Link to="/">Browse tours</Link></div>
            )}
            {bookings && bookings.length > 0 && (
              <>
                <p className="account-item__text">
                  Total paid: <strong>{formatINR(total)}</strong> across {bookings.length} booking
                  {bookings.length > 1 ? 's' : ''}.
                </p>
                <table className="billing-table">
                  <thead>
                    <tr><th>Date</th><th>Tour</th><th>Status</th><th className="right">Amount</th></tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.id}>
                        <td>{dateFmt(b.createdAt)}</td>
                        <td>{b.tour ? <Link to={`/tour/${b.tour.slug}`}>{b.tour.name}</Link> : 'Deleted tour'}</td>
                        <td><span className={`pill ${b.paid ? 'pill--ok' : 'pill--warn'}`}>{b.paid ? 'Paid' : 'Pending'}</span></td>
                        <td className="right">{formatINR(b.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
