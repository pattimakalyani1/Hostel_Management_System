import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationAPI } from '../services/api';
import '../styles/notifications.css';

// Reusable notification bell for BOTH Student and Warden headers.
// Each user only ever sees their own notifications (enforced by the backend).
const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationAPI.getUnreadCount();
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      // Silent: the bell should never break the header.
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationAPI.getAll();
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll the unread count on mount and every 30s.
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchAll();
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Silent
    }
  };

  const handleClickNotification = async (n) => {
    if (!n.isRead) {
      try {
        await notificationAPI.markAsRead(n.id);
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
        setUnreadCount((c) => Math.max(c - 1, 0));
      } catch {
        // Silent
      }
    }
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const formatWhen = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  };

  return (
    <div className="notif-bell" ref={wrapperRef}>
      <button
        className="notif-bell-btn"
        onClick={toggleOpen}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <svg
          className="notif-bell-icon"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown" role="menu">
          <div className="notif-dropdown-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className="notif-mark-all" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notif-list">
            {loading ? (
              <div className="notif-empty">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">No notifications yet.</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  className={`notif-item ${n.isRead ? '' : 'unread'}`}
                  onClick={() => handleClickNotification(n)}
                >
                  <div className="notif-item-title">{n.title}</div>
                  <div className="notif-item-message">{n.message}</div>
                  <div className="notif-item-time">{formatWhen(n.createdAt)}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
