import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useAlert } from '../context/AlertContext.jsx';

function Brand({ light }) {
  return (
    <Link to="/" className={light ? 'footer__logo' : 'header__logo'} aria-label="YatraHub home">
      <img
        src={light ? '/img/logo-white.png' : '/img/logo-green.png'}
        alt="YatraHub"
      />
    </Link>
  );
}

function Header() {
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleLogout = async e => {
    e.preventDefault();
    try {
      await logout();
      navigate('/');
    } catch {
      showAlert('error', 'Error logging out! Try again.');
    }
  };

  return (
    <header className={`header${open ? ' is-open' : ''}`}>
      <Brand />
      <button
        className="nav-toggle"
        type="button"
        aria-label="Toggle menu"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <span />
        <span />
        <span />
      </button>
      <nav className="nav nav--tours">
        <NavLink to="/" end className="nav__el">
          Tours
        </NavLink>
        {user && (
          <NavLink to="/my-tours" className="nav__el">
            My trips
          </NavLink>
        )}
      </nav>
      <nav className="nav nav--user">
        {user ? (
          <>
            <button type="button" className="nav__el nav__el--logout" onClick={handleLogout}>
              Log out
            </button>
            <NavLink to="/me" className="nav__el">
              <img
                className="nav__user-img"
                src={`/img/users/${user.photo}`}
                alt=""
              />
              <span>{user.name.split(' ')[0]}</span>
            </NavLink>
          </>
        ) : (
          <>
            <NavLink to="/login" className="nav__el">
              Log in
            </NavLink>
            <NavLink to="/signup" className="nav__el nav__el--cta">
              Sign up
            </NavLink>
          </>
        )}
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__brand">
        <Brand light />
        <p>
          Guided journeys across India — mountains, coasts, wildlife, and
          heritage — planned with local experts.
        </p>
      </div>
      <ul className="footer__nav">
        <li>
          <Link to="/">All tours</Link>
        </li>
        <li>
          <Link to="/about">About us</Link>
        </li>
        <li>
          <Link to="/become-a-guide">Become a guide</Link>
        </li>
        <li>
          <Link to="/careers">Careers</Link>
        </li>
        <li>
          <a href="mailto:hello@yatrahub.in">Contact</a>
        </li>
      </ul>
      <p className="footer__copyright">
        &copy; {new Date().getFullYear()} YatraHub. Crafted in India. All
        rights reserved.
      </p>
    </footer>
  );
}

export default function Layout() {
  return (
    <div className="app">
      <Header />
      <div className="app__body">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
