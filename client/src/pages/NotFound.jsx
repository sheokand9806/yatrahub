import { Link } from 'react-router-dom';
import { usePageTitle } from '../utils.js';

export default function NotFound({ message = "This page doesn't exist." }) {
  usePageTitle('Something went wrong!');
  return (
    <main className="main">
      <div className="error">
        <div className="error__title">
          <h2 className="heading-secondary heading-secondary--error">
            This trail doesn’t go anywhere
          </h2>
          <h2 className="error__emoji">🧭</h2>
        </div>
        <div className="error__msg">{message}</div>
        <p className="form__link">
          <Link to="/">Back to all tours</Link>
        </p>
      </div>
    </main>
  );
}
