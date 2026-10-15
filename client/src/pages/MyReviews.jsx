import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api';
import AccountNav from '../components/AccountNav.jsx';
import { useAlert } from '../context/AlertContext.jsx';
import { usePageTitle } from '../utils.js';

const dateFmt = d =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function Stars({ value, onChange }) {
  return (
    <div className="reviews__rating">
      {[1, 2, 3, 4, 5].map(star => (
        <svg
          key={star}
          onClick={onChange ? () => onChange(star) : undefined}
          style={onChange ? { cursor: 'pointer' } : undefined}
          className={`reviews__star reviews__star--${value >= star ? 'active' : 'inactive'}`}
        >
          <use href="/img/icons.svg#icon-star" />
        </svg>
      ))}
    </div>
  );
}

function MyReview({ review, onSaved, onDeleted }) {
  const { showAlert } = useAlert();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(review.review);
  const [rating, setRating] = useState(review.rating);
  const [busy, setBusy] = useState(false);

  const save = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.patch(`/reviews/${review.id}`, { review: text, rating });
      onSaved({ ...review, review: text, rating });
      setEditing(false);
      showAlert('success', 'Review updated!');
    } catch (err) {
      showAlert('error', errorMessage(err));
    }
    setBusy(false);
  };

  const remove = async () => {
    if (!window.confirm('Delete this review?')) return;
    setBusy(true);
    try {
      await api.delete(`/reviews/${review.id}`);
      onDeleted(review.id);
      showAlert('success', 'Review deleted.');
    } catch (err) {
      showAlert('error', errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <article className="account-item">
      {review.tour && (
        <img className="account-item__img" src={`/img/tours/${review.tour.imageCover}`} alt="" />
      )}
      <div className="account-item__body">
        <h3 className="account-item__title">
          {review.tour ? <Link to={`/tour/${review.tour.slug}`}>{review.tour.name}</Link> : 'Deleted tour'}
        </h3>
        <span className="account-item__meta">{dateFmt(review.createdAt)}</span>
        {editing ? (
          <form onSubmit={save}>
            <Stars value={rating} onChange={setRating} />
            <textarea className="form__input" rows={4} required value={text} onChange={e => setText(e.target.value)} />
            <div className="account-item__actions">
              <button className="btn btn--small btn--green" disabled={busy}>Save</button>
              <button type="button" className="btn btn--small btn--ghost" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <Stars value={review.rating} />
            <p className="account-item__text">{review.review}</p>
            <div className="account-item__actions">
              <button className="btn btn--small btn--ghost" onClick={() => setEditing(true)}>Edit</button>
              <button className="btn btn--small btn--ghost btn--danger" onClick={remove} disabled={busy}>Delete</button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

export default function MyReviews() {
  usePageTitle('My reviews');
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/reviews/my-reviews')
      .then(res => setReviews(res.data.data.data))
      .catch(err => setError(errorMessage(err)));
  }, []);

  return (
    <main className="main">
      <div className="user-view">
        <AccountNav />
        <div className="user-view__content">
          <div className="user-view__form-container">
            <h2 className="heading-secondary ma-bt-md">My reviews</h2>
            {error && <div className="loading-box">{error}</div>}
            {!error && !reviews && <div className="loading-box">Loading your reviews…</div>}
            {reviews && reviews.length === 0 && (
              <div className="loading-box">
                You haven’t reviewed any tours yet.{' '}
                <Link to="/my-tours">See your bookings</Link>
              </div>
            )}
            {reviews && reviews.map(r => (
              <MyReview
                key={r.id}
                review={r}
                onSaved={u => setReviews(list => list.map(x => (x.id === u.id ? u : x)))}
                onDeleted={id => setReviews(list => list.filter(x => x.id !== id))}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
