import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import Icon from '../components/Icon.jsx';
import ReviewCard from '../components/ReviewCard.jsx';
import TourMap from '../components/TourMap.jsx';
import { useAlert } from '../context/AlertContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatINR, formatMonthYear, usePageTitle } from '../utils.js';
import NotFound from './NotFound.jsx';

// Loads Razorpay's Checkout script once
function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load Razorpay. Check your internet connection.'));
    document.body.appendChild(script);
  });
}

function OverviewBox({ label, text, icon }) {
  return (
    <div className="overview-box__detail">
      <Icon name={icon} className="overview-box__icon" />
      <span className="overview-box__label">{label}</span>
      <span className="overview-box__text">{text}</span>
    </div>
  );
}

export default function Tour() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [tour, setTour] = useState(null);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(false);

  usePageTitle(tour ? `${tour.name} Tour` : 'Tour');

  useEffect(() => {
    setTour(null);
    setError('');
    api
      .get(`/tours/slug/${slug}`)
      .then(res => setTour(res.data.data.data))
      .catch(err =>
        setError(err?.response?.status === 404 ? 'notfound' : errorMessage(err))
      );
  }, [slug]);

  const bookTour = async () => {
    setBooking(true);
    try {
      // 1) Ask the API to create a Razorpay order (amount is taken from the DB, in paise)
      const res = await api.post(`/bookings/create-order/${tour.id}`);
      const { order, keyId, tour: t, user: u } = res.data;

      // 2) Load Razorpay Checkout and open the payment pop-up
      await loadRazorpay();
      const rzp = new window.Razorpay({
        key: keyId,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        name: 'YatraHub',
        description: t.name,
        image: `${window.location.origin}/img/logo-green-round.png`,
        prefill: { name: u.name, email: u.email },
        theme: { color: '#0f6e56' },
        handler: async response => {
          // 3) Payment done: the API verifies the signature and records the booking
          try {
            await api.post('/bookings/verify-payment', response);
            navigate('/my-tours?alert=booking');
          } catch (err) {
            showAlert('error', errorMessage(err));
            setBooking(false);
          }
        },
        modal: { ondismiss: () => setBooking(false) }
      });
      rzp.on('payment.failed', r => {
        showAlert('error', r.error?.description || 'Payment failed. Please try again.');
        setBooking(false);
      });
      rzp.open();
    } catch (err) {
      showAlert('error', errorMessage(err));
      setBooking(false);
    }
  };

  if (error === 'notfound') return <NotFound message="There is no tour with that name." />;
  if (error) return <main className="main"><div className="loading-box">{error}</div></main>;
  if (!tour) return <main className="main"><div className="loading-box">Loading tour…</div></main>;

  const paragraphs = (tour.description || '').split('\n');

  return (
    <>
      <section className="section-header">
        <div className="header__hero">
          <div className="header__hero-overlay">&nbsp;</div>
          <img
            className="header__hero-img"
            src={`/img/tours/${tour.imageCover}`}
            alt={tour.name}
          />
        </div>

        <div className="heading-box">
          <h1 className="heading-primary">
            <span>{tour.name}</span>
          </h1>
          <div className="heading-box__group">
            <div className="heading-box__detail">
              <Icon name="clock" className="heading-box__icon" />
              <span className="heading-box__text">{`${tour.duration} days`}</span>
            </div>
            <div className="heading-box__detail">
              <Icon name="map-pin" className="heading-box__icon" />
              <span className="heading-box__text">{tour.startLocation?.description}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section-description">
        <div className="overview-box">
          <div>
            <div className="overview-box__group">
              <h2 className="heading-secondary ma-bt-lg">Quick facts</h2>
              <OverviewBox label="Next date" text={formatMonthYear(tour.startDates?.[0])} icon="calendar" />
              <OverviewBox label="Difficulty" text={tour.difficulty} icon="trending-up" />
              <OverviewBox label="Participants" text={`${tour.maxGroupSize} people`} icon="user" />
              <OverviewBox label="Rating" text={`${tour.ratingsAverage} / 5`} icon="star" />
              <OverviewBox label="Price" text={`${formatINR(tour.price)} per person`} icon="credit-card" />
            </div>

            <div className="overview-box__group">
              <h2 className="heading-secondary ma-bt-lg">Your tour guides</h2>
              {tour.guides.map(guide => (
                <div className="overview-box__detail" key={guide._id}>
                  <img
                    src={`/img/users/${guide.photo}`}
                    alt={guide.name}
                    className="overview-box__img"
                  />
                  {guide.role === 'lead-guide' && (
                    <span className="overview-box__label">Lead guide</span>
                  )}
                  {guide.role === 'guide' && (
                    <span className="overview-box__label">Tour guide</span>
                  )}
                  <span className="overview-box__text">{guide.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="description-box">
          <h2 className="heading-secondary ma-bt-lg">{`About ${tour.name} tour`}</h2>
          {paragraphs.map((p, i) => (
            <p className="description__text" key={i}>
              {p}
            </p>
          ))}
        </div>
      </section>

      <section className="section-pictures">
        {tour.images.map((img, i) => (
          <div className="picture-box" key={img}>
            <img
              className={`picture-box__img picture-box__img--${i + 1}`}
              src={`/img/tours/${img}`}
              alt={`${tour.name} ${i + 1}`}
            />
          </div>
        ))}
      </section>

      <section className="section-map">
        <TourMap locations={tour.locations} />
      </section>

      <section className="section-reviews">
        <div className="reviews-wrap">
          <h2 className="heading-secondary">What travellers say</h2>
          <div className="reviews">
            {(tour.reviews || []).length === 0 && (
              <p className="cta__text" style={{ color: '#c9d8d1' }}>
                No reviews yet. Be the first after your trip.
              </p>
            )}
            {(tour.reviews || []).map(review => (
              <ReviewCard key={review.id || review._id} review={review} />
            ))}
          </div>
        </div>
      </section>

      <section className="section-cta">
        <div className="cta">
          <div className="cta__img cta__img--logo">
            <img src="/img/logo-white.png" alt="YatraHub logo" />
          </div>
          {tour.images[1] && (
            <img src={`/img/tours/${tour.images[1]}`} alt="Tour" className="cta__img cta__img--1" />
          )}
          {tour.images[2] && (
            <img src={`/img/tours/${tour.images[2]}`} alt="Tour" className="cta__img cta__img--2" />
          )}
          <div className="cta__content">
            <h2 className="heading-secondary">Ready when you are</h2>
            <p className="cta__text">
              {`${tour.duration} days, one adventure, and a trip you’ll talk about for years. From ${formatINR(tour.price)} per person.`}
            </p>
            {user ? (
              <button
                className="btn btn--green span-all-rows"
                id="book-tour"
                onClick={bookTour}
                disabled={booking}
              >
                {booking ? 'Opening payment...' : 'Book this tour'}
              </button>
            ) : (
              <Link to="/login" className="btn btn--green span-all-rows">
                Log in to book
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
