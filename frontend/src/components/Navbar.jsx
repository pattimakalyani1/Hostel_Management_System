import NotificationBell from './NotificationBell';
import '../styles/navbar.css';

const Navbar = ({ title }) => {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <h1 className="navbar-title">{title || 'Dashboard'}</h1>
      </div>
      <div className="navbar-right">
        {/* User identity lives in the sidebar; the header stays clean with
            just the page title and shared notification bell. */}
        <NotificationBell />
      </div>
    </nav>
  );
};

export default Navbar;
