import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../api';
import AccountNav from './AccountNav.jsx';
import { usePageTitle } from '../utils.js';

// Page frame used by every admin screen: sidebar + title bar + content
export function AdminPage({ title, subtitle, actions, children }) {
  usePageTitle(title);
  return (
    <main className="main">
      <div className="user-view user-view--wide">
        <AccountNav />
        <div className="user-view__content admin-content">
          <div className="admin-head">
            <div>
              <h2 className="heading-secondary">{title}</h2>
              {subtitle && <p className="admin-head__sub">{subtitle}</p>}
            </div>
            {actions && <div className="admin-head__actions">{actions}</div>}
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}

export function StatCard({ label, value, note }) {
  return (
    <div className="stat-card">
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
      {note && <span className="stat-card__note">{note}</span>}
    </div>
  );
}

export function Pill({ tone = 'ok', children }) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}

export function Stars({ value }) {
  return (
    <span className="stars" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map(n => (
        <svg key={n} className={`stars__star${value >= n ? ' is-on' : ''}`}>
          <use href="/img/icons.svg#icon-star" />
        </svg>
      ))}
    </span>
  );
}

// Loads a list endpoint; returns { data, error, loading, reload, setData }
export function useList(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const reload = useCallback(() => {
    setError('');
    return api
      .get(url)
      .then(res => setData(res.data.data.data))
      .catch(err => setError(errorMessage(err)));
  }, [url]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, setData, error, loading: !data && !error, reload };
}

export function LoadState({ loading, error, empty, emptyText }) {
  if (error) return <div className="loading-box">{error}</div>;
  if (loading) return <div className="loading-box">Loading…</div>;
  if (empty) return <div className="loading-box">{emptyText}</div>;
  return null;
}
