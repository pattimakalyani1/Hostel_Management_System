import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { studentAPI, feeAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import DashboardCard from '../components/DashboardCard';
import { formatCurrency } from '../utils/feeHelpers';
import '../styles/dashboard.css';
import '../styles/fees.css';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [feesSummary, setFeesSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch dashboard and fees together. Fees give the true outstanding amount
      // (based on successful payments) rather than a sum of full fee amounts.
      const [dashboardRes, feesRes] = await Promise.all([
        studentAPI.getDashboard(),
        feeAPI.getMyFees().catch(() => null)
      ]);
      setDashboardData(dashboardRes.data);
      if (feesRes) {
        const fees = feesRes.data.fees || [];
        const unpaidCount = fees.filter((f) => Number(f.outstandingAmount) > 0).length;
        setFeesSummary({
          totalOutstanding: feesRes.data.totalOutstanding || 0,
          unpaidCount
        });
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getStudentName = () => {
    if (dashboardData?.student?.name) return dashboardData.student.name;
    if (user?.name) return user.name;
    return 'Student';
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar userType="student" />
        <div className="dashboard-main">
          <Navbar title="Student Dashboard" />
          <main className="dashboard-content">
            <div className="loading-state">
              <div className="loading-spinner large"></div>
              <p>Loading dashboard...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar userType="student" />
      <div className="dashboard-main">
        <Navbar title="Student Dashboard" />
        <main className="dashboard-content">
          <div className="dashboard-header">
            <div className="welcome-section">
              <h1>{getGreeting()}, {getStudentName()}</h1>
              <p className="welcome-subtitle">Welcome to your student portal</p>
            </div>
          </div>

          {error && (
            <div className="dashboard-error">
              {error}
            </div>
          )}

          <section className="dashboard-cards">
            <DashboardCard
              title="My Room"
              value={dashboardData?.room?.roomNumber || '--'}
              color="primary"
              subtitle={dashboardData?.room ? `Floor ${dashboardData.room.floor}, Bed ${dashboardData.room.bedNumber}` : 'Not allocated'}
            />
            <div
              role="button"
              tabIndex={0}
              className="dashboard-card-link"
              onClick={() => navigate('/student/fees')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/student/fees'); }}
            >
              <DashboardCard
                title="Outstanding Fees"
                value={
                  feesSummary
                    ? (feesSummary.unpaidCount || 0)
                    : (dashboardData?.summary?.pendingFeesCount || 0)
                }
                color={
                  (feesSummary ? feesSummary.totalOutstanding : dashboardData?.summary?.pendingFeesTotal) > 0
                    ? 'warning'
                    : 'success'
                }
                subtitle={
                  feesSummary
                    ? (feesSummary.totalOutstanding > 0 ? formatCurrency(feesSummary.totalOutstanding) : 'All clear')
                    : (dashboardData?.summary?.pendingFeesTotal > 0 ? formatCurrency(dashboardData.summary.pendingFeesTotal) : 'All clear')
                }
              />
            </div>
            <DashboardCard
              title="Open Complaints"
              value={dashboardData?.summary?.openComplaintsCount || 0}
              color={dashboardData?.summary?.openComplaintsCount > 0 ? 'info' : 'success'}
              subtitle="Active complaints"
            />
            <DashboardCard
              title="Pending Outpass"
              value={dashboardData?.summary?.pendingOutpassCount || 0}
              color={dashboardData?.summary?.pendingOutpassCount > 0 ? 'info' : 'success'}
              subtitle="View outpass management"
              to="/student/outpass"
            />
          </section>

          <section className="dashboard-info">
            <div className="info-card">
              <h3>Profile Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Name</span>
                  <span className="info-value">{dashboardData?.student?.name || '--'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email</span>
                  <span className="info-value">{dashboardData?.student?.email || '--'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Phone</span>
                  <span className="info-value">{dashboardData?.student?.phone || '--'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Member Since</span>
                  <span className="info-value">
                    {dashboardData?.student?.memberSince 
                      ? new Date(dashboardData.student.memberSince).toLocaleDateString() 
                      : '--'}
                  </span>
                </div>
              </div>
            </div>

            <div className="info-card">
              <h3>Room Information</h3>
              {dashboardData?.room ? (
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Room Number</span>
                    <span className="info-value">{dashboardData.room.roomNumber}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Bed Number</span>
                    <span className="info-value">{dashboardData.room.bedNumber}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Floor</span>
                    <span className="info-value">{dashboardData.room.floor}</span>
                  </div>
                  {dashboardData.room.roomType && (
                    <div className="info-item">
                      <span className="info-label">Room Type</span>
                      <span className="info-value">{dashboardData.room.roomType}</span>
                    </div>
                  )}
                  <div className="info-item">
                    <span className="info-label">Status</span>
                    <span className="info-value">{dashboardData.room.status || 'ACTIVE'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Allocated Date</span>
                    <span className="info-value">
                      {dashboardData.room.allocatedDate
                        ? new Date(dashboardData.room.allocatedDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })
                        : '--'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <p>No room has been allocated yet.</p>
                  <span className="empty-hint">Contact the warden for room allocation</span>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;
