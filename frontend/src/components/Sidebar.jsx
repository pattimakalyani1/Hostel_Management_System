import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/sidebar.css';

const Sidebar = ({ userType }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const [activeItem, setActiveItem] = useState('dashboard');

  // Keep active item in sync with the current URL
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/profile')) {
      setActiveItem('profile');
    } else if (path.startsWith('/warden/rooms') || path.startsWith('/student/room')) {
      setActiveItem('rooms');
    } else if (path.includes('/allocations')) {
      setActiveItem('allocations');
    } else if (path.includes('/fees')) {
      setActiveItem('fees');
    } else if (path.includes('/payments')) {
      setActiveItem('payments');
    } else if (path.includes('/complaints')) {
      setActiveItem('complaints');
    } else if (path.includes('/outpass')) {
      setActiveItem('outpass');
    } else if (path.includes('/students')) {
      setActiveItem('students');
    } else if (path.includes('/dashboard')) {
      setActiveItem('dashboard');
    }
  }, [location.pathname]);

  const studentMenuItems = [
    { id: 'dashboard',  label: 'Dashboard',        path: '/student/dashboard' },
    { id: 'profile',    label: 'My Profile',       path: '/student/profile' },
    { id: 'fees',       label: 'My Fees',          path: '/student/fees' },
    { id: 'payments',   label: 'Payment History',  path: '/student/payments' },
    { id: 'complaints', label: 'My Complaints',    path: '/student/complaints' },
    { id: 'outpass',    label: 'My Outpass',       path: '/student/outpass' },
  ];

  const wardenMenuItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/warden/dashboard' },
    { id: 'rooms', label: 'Rooms', path: '/warden/rooms' },
    { id: 'allocations', label: 'Allocations', path: '/warden/allocations' },
    { id: 'fees', label: 'Fees', path: '/warden/fees' },
    { id: 'complaints', label: 'Complaints', path: '/warden/complaints' },
    { id: 'outpass', label: 'Outpass', path: '/warden/outpass' },
    { id: 'students', label: 'Students', path: '/warden/students' }
  ];

  const menuItems = userType === 'warden' ? wardenMenuItems : studentMenuItems;

  const handleMenuClick = (item) => {
    setActiveItem(item.id);
    navigate(item.path);
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
                className={`sidebar-menu-item ${activeItem === item.id ? 'active' : ''}`}
                onClick={() => handleMenuClick(item)}
              >
                <span className="menu-label">{item.label}</span>
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
