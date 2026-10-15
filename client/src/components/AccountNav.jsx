import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function Item({ to, text, icon, end = true }) {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) => (isActive ? 'side-nav__link is-active' : 'side-nav__link')}
      >
        <Icon name={icon} />
        {text}
      </NavLink>
    </li>
  );
}

// Sidebar shared by every "account" page and every admin page
export default function AccountNav() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  return (
    <nav className="user-view__menu">
      {isAdmin && <h5 className="admin-nav__heading admin-nav__heading--first">My account</h5>}
      <ul className="side-nav">
        <Item to="/me" text="Settings" icon="settings" />
        <Item to="/my-tours" text="My bookings" icon="briefcase" />
        <Item to="/my-reviews" text="My reviews" icon="star" />
        <Item to="/billing" text="Billing" icon="credit-card" />
      </ul>

      {isAdmin && (
        <div className="admin-nav">
          <h5 className="admin-nav__heading">Admin</h5>
          <ul className="side-nav">
            <Item to="/admin" text="Dashboard" icon="bar-chart-2" />
            <Item to="/admin/tours" text="Manage tours" icon="map" end={false} />
            <Item to="/admin/bookings" text="Manage bookings" icon="briefcase" />
            <Item to="/admin/reviews" text="Manage reviews" icon="star" />
            <Item to="/admin/users" text="Manage users" icon="users" />
          </ul>
        </div>
      )}
    </nav>
  );
}
