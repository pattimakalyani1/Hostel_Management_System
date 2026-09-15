import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/sidebar.css';

const Sidebar = ({ userType }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const routeToItem = () => {
    if (location.pathname.startsWith('/warden/allocations')) return 'allocations';
    return 'dashboard';
  };
  const [activeItem, setActiveItem] = useState(routeToItem());

  const studentMenuItems = [
    { id: 'dashboard', label: 'Dashboard', isActive: true },
    { id: 'profile', label: 'My Profile', isPlaceholder: true },
    { id: 'room', label: 'My Room', isPlaceholder: true },
    { id: 'fees', label: 'My Fees', isPlaceholder: true },
    { id: 'complaints', label: 'My Complaints', isPlaceholder: true },
    { id: 'outpass', label: 'My Outpass', isPlaceholder: true }
  ];

  const wardenMenuItems = [
    { id: 'dashboard', label: 'Dashboard', isActive: true },
    { id: 'rooms', label: 'Rooms', isPlaceholder: true },
    { id: 'allocations', label: 'Allocations' },
    { id: 'fees', label: 'Fees', isPlaceholder: true },
    { id: 'complaints', label: 'Complaints', isPlaceholder: true },
    { id: 'outpass', label: 'Outpass', isPlaceholder: true },
    { id: 'students', label: 'Students', isPlaceholder: true }
  ];

  const menuItems = userType === 'warden' ? wardenMenuItems : studentMenuItems;

  const handleMenuClick = (item) => {
    if (item.isPlaceholder) {
      setActiveItem(item.id);
      return;
    }
    if (item.id === 'dashboard') {
      setActiveItem('dashboard');
      if (userType === 'warden') {
        navigate('/warden/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } else if (item.id === 'allocations' && userType === 'warden') {
      setActiveItem('allocations');
      navigate('/warden/allocations');
    } else {
      setActiveItem(item.id);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = () => {
    navigate('/change-password');
  };

  const getUserName = () => {
    if (user?.name) return user.name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">H</div>
        <div className="sidebar-brand">
          <h2>Hostel MS</h2>
          <span className="sidebar-subtitle">
            {userType === 'warden' ? 'Admin Panel' : 'Student Portal'}
          </span>
        </div>
      </div>

      <div className="sidebar-user">
        <div className="sidebar-avatar">
          {getUserName().charAt(0).toUpperCase()}
        </div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{getUserName()}</span>
          <span className="sidebar-user-role">
            {userType === 'warden' ? 'Administrator' : 'Student'}
          </span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul className="sidebar-menu">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                className={`sidebar-menu-item ${activeItem === item.id ? 'active' : ''} ${item.isPlaceholder ? 'placeholder' : ''}`}
                onClick={() => handleMenuClick(item)}
              >
                <span className="menu-label">{item.label}</span>
                {item.isPlaceholder && <span className="menu-badge">Soon</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-footer-btn change-password" onClick={handleChangePassword}>
          <span className="menu-label">Change Password</span>
        </button>
        <button className="sidebar-footer-btn logout" onClick={handleLogout}>
          <span className="menu-label">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
