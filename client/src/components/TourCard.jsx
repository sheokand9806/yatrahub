import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { formatINR, formatMonthYear } from '../utils.js';

export default function TourCard({ tour }) {
  return (
    <article className="card">
      <div className="card__header">
        <div className="card__picture">
          <div className="card__picture-overlay">&nbsp;</div>
          <img
            src={`/img/tours/${tour.imageCover}`}
            alt={tour.name}
            className="card__picture-img"
          />
        </div>
        <span className="card__badge">{tour.difficulty}</span>
        <h3 className="heading-tertirary">
          <span>{tour.name}</span>
        </h3>
      </div>

      <div className="card__details">
        <h4 className="card__sub-heading">{`${tour.difficulty} · ${tour.duration}-day tour`}</h4>
        <p className="card__text">{tour.summary}</p>
        <div className="card__data">
          <Icon name="map-pin" className="card__icon" />
          <span>{tour.startLocation?.description}</span>
        </div>
        <div className="card__data">
          <Icon name="calendar" className="card__icon" />
          <span>{formatMonthYear(tour.startDates?.[0])}</span>
        </div>
        <div className="card__data">
          <Icon name="flag" className="card__icon" />
          <span>{`${tour.locations?.length || 0} stops`}</span>
        </div>
        <div className="card__data">
          <Icon name="user" className="card__icon" />
          <span>{`${tour.maxGroupSize} people`}</span>
        </div>
      </div>

      <div className="card__footer">
        <p>
          <span className="card__footer-value">{formatINR(tour.price)}</span>{' '}
          <span className="card__footer-text">per person</span>
        </p>
        <p className="card__ratings">
          <span className="card__footer-value">{tour.ratingsAverage}</span>{' '}
          <span className="card__footer-text">{`(${tour.ratingsQuantity})`}</span>
        </p>
        <Link to={`/tour/${tour.slug}`} className="btn btn--green btn--small">
          View tour
        </Link>
      </div>
    </article>
  );
}
