import { useEffect, useMemo, useState } from 'react';
import api, { errorMessage } from '../api';
import TourCard from '../components/TourCard.jsx';
import { usePageTitle } from '../utils.js';

const FILTERS = [
  { id: 'all', label: 'All trips' },
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Moderate' },
  { id: 'difficult', label: 'Challenging' }
];

export default function Overview() {
  usePageTitle('Discover India');
  const [tours, setTours] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    api
      .get('/tours')
      .then(res => setTours(res.data.data.data))
      .catch(err => setError(errorMessage(err)));
  }, []);

  const visible = useMemo(() => {
    if (!tours) return [];
    const q = query.trim().toLowerCase();
    return tours.filter(tour => {
      const byDiff = filter === 'all' || tour.difficulty === filter;
      const byQuery =
        !q ||
        tour.name.toLowerCase().includes(q) ||
        (tour.startLocation?.description || '').toLowerCase().includes(q);
      return byDiff && byQuery;
    });
  }, [tours, filter, query]);

  const heroImg = tours?.[0]?.imageCover
    ? `/img/tours/${tours[0].imageCover}`
    : '/img/tours/tour-1-cover.jpg';

  return (
    <main className="main main--flush">
      <section className="hero">
        <div className="hero__media">
          <img src={heroImg} alt="" />
          <div className="hero__overlay" />
        </div>
        <div className="hero__content">
          <p className="eyebrow">YatraHub · India</p>
          <h1>Travel that feels like a story, not a checklist.</h1>
          <p>
            Small-group tours across mountains, coasts, wildlife, and heritage
            cities — led by local guides who know the road.
          </p>
          <div className="hero__actions">
            <a href="#tours" className="btn btn--green">
              Browse tours
            </a>
          </div>
          <div className="hero__stats">
            <div className="hero__stat">
              <strong>{tours?.length ?? '—'}</strong>
              <span>curated journeys</span>
            </div>
            <div className="hero__stat">
              <strong>4.8</strong>
              <span>average rating</span>
            </div>
            <div className="hero__stat">
              <strong>12k+</strong>
              <span>happy travellers</span>
            </div>
          </div>
        </div>
      </section>

      <section id="tours" className="main" style={{ background: 'transparent', paddingTop: '4.8rem' }}>
        <div className="overview-head">
          <div>
            <h2>Upcoming departures</h2>
            <p>Pick a pace, a place, and a date. We’ll handle the rest.</p>
          </div>
          <div className="search">
            <input
              type="search"
              placeholder="Search Himalayas, Kerala, forts…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              aria-label="Search tours"
            />
          </div>
        </div>

        <div className="filters" style={{ maxWidth: '120rem', margin: '0 auto 2.8rem' }}>
          {FILTERS.map(item => (
            <button
              key={item.id}
              type="button"
              className={`filter${filter === item.id ? ' is-active' : ''}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && <div className="loading-box">{error}</div>}
        {!error && !tours && (
          <div className="skeleton-grid">
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        )}
        {tours && visible.length === 0 && (
          <div className="loading-box">
            {tours.length === 0 ? (
              <>
                No tours yet. Run <code>npm run import-data</code> to load the demo
                tours.
              </>
            ) : (
              'No tours match that search. Try another place or difficulty.'
            )}
          </div>
        )}
        {visible.length > 0 && (
          <div className="card-container">
            {visible.map(tour => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
