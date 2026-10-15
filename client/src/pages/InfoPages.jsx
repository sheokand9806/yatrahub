import { Link } from 'react-router-dom';
import { usePageTitle } from '../utils.js';

function Page({ title, lead, children }) {
  usePageTitle(title);
  return (
    <main className="main">
      <div className="info-page">
        <h1 className="heading-secondary">{title}</h1>
        <p className="info-page__lead">{lead}</p>
        {children}
      </div>
    </main>
  );
}

export function About() {
  return (
    <Page
      title="About us"
      lead="YatraHub plans guided journeys across India — mountains, coasts, wildlife and heritage — together with local experts."
    >
      <p>We started YatraHub because the best trips are led by people who know the place: guides who grew up on the trail, run the homestay, or have tracked the same tigers for years.</p>
      <p>Every tour is small-group, fairly priced in rupees, and designed so that more of what you pay stays with local communities.</p>
      <p><Link to="/" className="btn btn--green btn--small">Explore tours</Link></p>
    </Page>
  );
}

export function BecomeGuide() {
  return (
    <Page
      title="Become a guide"
      lead="Know a trail, a town or a species better than anyone? Lead a YatraHub tour."
    >
      <p>We look for guides with deep local knowledge, first-aid training and a love of hosting small groups. You set the pace; we handle bookings, payments and logistics.</p>
      <p>To apply, email us your region, languages, experience and a short note on the tour you would lead.</p>
      <p>
        <a className="btn btn--green btn--small" href="mailto:guides@yatrahub.in?subject=Guide%20application">
          Apply by email
        </a>
      </p>
    </Page>
  );
}

export function Careers() {
  return (
    <Page
      title="Careers"
      lead="Help us make travel in India more personal, sustainable and fun."
    >
      <p>We’re a small team building the platform and the tours behind it. We hire for tour operations, customer support and engineering.</p>
      <p>No open roles are listed right now, but we’d still like to hear from you.</p>
      <p>
        <a className="btn btn--green btn--small" href="mailto:careers@yatrahub.in?subject=Careers%20at%20YatraHub">
          Get in touch
        </a>
      </p>
    </Page>
  );
}
