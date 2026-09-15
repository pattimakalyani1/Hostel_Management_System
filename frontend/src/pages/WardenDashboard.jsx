import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { wardenAPI, feeAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import DashboardCard from '../components/DashboardCard';
import { formatCurrency } from '../utils/feeHelpers';
import '../styles/dashboard.css';
import '../styles/fees.css';

const WardenDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [feeSummary, setFeeSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch the existing dashboard plus the fee summary for collection info.
      const [dashboardRes, summaryRes] = await Promise.all([
        wardenAPI.getDashboard(),
        feeAPI.getSummary().catch(() => null)
      ]);
      setDashboardData(dashboardRes.data);
      if (summaryRes) {
        setFeeSummary(summaryRes.data.summary);
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

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar userType="warden" />
        <div className="dashboard-main">
          <Navbar title="Admin Dashboard" />
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
      <Sidebar userType="warden" />
      <div className="dashboard-main">
        <Navbar title="Admin Dashboard" />
        <main className="dashboard-content">
          <div className="dashboard-header">
            <div className="welcome-section">
              <h1>{getGreeting()}, Admin</h1>
              <p className="welcome-subtitle">Hostel management overview</p>
            </div>
          </div>

          {error && (
            <div className="dashboard-error">
              {error}
            </div>
          )}

          <section className="dashboard-cards warden-cards">
            <DashboardCard
              title="Total Students"
              value={dashboardData?.summary?.totalStudents || 0}
              color="primary"
              subtitle="Registered students"
            />
            <DashboardCard
              title="Total Rooms"
              value={dashboardData?.summary?.totalRooms || 0}
              color="info"
              subtitle={`${dashboardData?.summary?.totalBeds || 0} beds total`}
            />
            <div
              role="button"
              tabIndex={0}
              className="dashboard-card-link"
              onClick={() => navigate('/warden/fees')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/warden/fees'); }}
            >
              <DashboardCard
                title="Pending Fees"
                value={dashboardData?.summary?.pendingFeesCount || 0}
                color={dashboardData?.summary?.pendingFeesCount > 0 ? 'warning' : 'success'}
                subtitle="Fees to collect"
              />
            </div>
            <DashboardCard
              title="Open Complaints"
              value={dashboardData?.summary?.openComplaintsCount || 0}
              color={dashboardData?.summary?.openComplaintsCount > 0 ? 'warning' : 'success'}
              subtitle="Need attention"
            />
            <DashboardCard
              title="Pending Outpass"
              value={dashboardData?.summary?.pendingOutpassCount || 0}
              color={dashboardData?.summary?.pendingOutpassCount > 0 ? 'warning' : 'success'}
              subtitle="Awaiting approval"
            />
            <DashboardCard
              title="Occupancy Rate"
              value={`${dashboardData?.summary?.occupancyRate || 0}%`}
              color="info"
              subtitle={`${dashboardData?.summary?.occupiedBeds || 0} / ${dashboardData?.summary?.totalBeds || 0} beds`}
            />
          </section>

          <section className="dashboard-info">
            <div className="info-card full-width">
              <h3>Hostel Statistics</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-value">{dashboardData?.summary?.totalStudents || 0}</span>
                  <span className="stat-label">Students</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{dashboardData?.summary?.totalRooms || 0}</span>
                  <span className="stat-label">Rooms</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{dashboardData?.summary?.availableBeds || 0}</span>
                  <span className="stat-label">Available Beds</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{dashboardData?.summary?.occupancyRate || 0}%</span>
                  <span className="stat-label">Occupancy</span>
                </div>
              </div>
            </div>

            <div className="info-card">
              <h3>Pending Actions</h3>
              <div className="action-list">
                <div className="action-item">
                  <span className="action-title">Pending Fees</span>
                  <span className="action-count">{dashboardData?.summary?.pendingFeesCount || 0}</span>
                </div>
                <div className="action-item">
                  <span className="action-title">Open Complaints</span>
                  <span className="action-count">{dashboardData?.summary?.openComplaintsCount || 0}</span>
                </div>
                <div className="action-item">
                  <span className="action-title">Pending Outpass</span>
                  <span className="action-count">{dashboardData?.summary?.pendingOutpassCount || 0}</span>
                </div>
              </div>
            </div>

            <div className="info-card">
              <h3>Fee Collection</h3>
              {feeSummary ? (
                <div className="action-list">
                  <div className="action-item">
                    <span className="action-title">Total Fee Amount</span>
                    <span className="action-count">{formatCurrency(feeSummary.totalFeeAmount)}</span>
                  </div>
                  <div className="action-item">
                    <span className="action-title">Total Collected</span>
                    <span className="action-count">{formatCurrency(feeSummary.totalPaidAmount)}</span>
                  </div>
                  <div className="action-item">
                    <span className="action-title">Total Outstanding</span>
                    <span className="action-count">{formatCurrency(feeSummary.totalOutstandingAmount)}</span>
                  </div>
                  <div className="action-item">
                    <span className="action-title">Overdue Fees</span>
                    <span className="action-count">{feeSummary.overdueFeesCount || 0}</span>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <p>Collection data unavailable</p>
                </div>
              )}
            </div>

            <div className="info-card">
              <h3>Admin Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Email</span>
                  <span className="info-value">{dashboardData?.warden?.email || user?.email || '--'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Role</span>
                  <span className="info-value">Administrator</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Member Since</span>
                  <span className="info-value">
                    {dashboardData?.warden?.memberSince 
                      ? new Date(dashboardData.warden.memberSince).toLocaleDateString() 
                      : '--'}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default WardenDashboard;
