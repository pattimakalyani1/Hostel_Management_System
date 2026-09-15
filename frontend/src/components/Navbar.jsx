import { useAuth } from '../context/AuthContext';
import '../styles/navbar.css';

const Navbar = ({ title }) => {
  const { user } = useAuth();

  const getRoleDisplay = () => {
    if (user?.role === 'WARDEN') return 'Admin';
    return 'Student';
  };

  const getUserInitial = () => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <h1 className="navbar-title">{title || 'Dashboard'}</h1>
      </div>
      <div className="navbar-user">
        <div className="user-info">
          <span className="user-name">{user?.name || user?.email?.split('@')[0]}</span>
          <span className="user-role">{getRoleDisplay()}</span>
        </div>
        <div className="user-avatar">
          {getUserInitial()}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
