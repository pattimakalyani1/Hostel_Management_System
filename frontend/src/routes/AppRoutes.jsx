import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

// Pages
import Login from '../pages/Login';
import StudentRegister from '../pages/StudentRegister';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import ChangePassword from '../pages/ChangePassword';
import StudentDashboard from '../pages/StudentDashboard';
import StudentComplaints from '../pages/StudentComplaints';
import StudentOutpass from '../pages/StudentOutpass';
import WardenDashboard from '../pages/WardenDashboard';
import WardenComplaints from '../pages/WardenComplaints';
import WardenOutpass from '../pages/WardenOutpass';
import RoomAllocation from '../pages/RoomAllocation';
import RoomsPage from '../pages/rooms/RoomsPage';
import RoomDetailPage from '../pages/rooms/RoomDetailPage';

const AppRoutes = () => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  const PublicRoute = ({ children }) => {
    if (isAuthenticated) {
      if (user?.role === 'WARDEN') return <Navigate to="/warden/dashboard" replace />;
      return <Navigate to="/student/dashboard" replace />;
    }
    return children;
  };

  return (
    <Routes>
      {/* ── Public Routes ── */}
      <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register"        element={<PublicRoute><StudentRegister /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password"  element={<PublicRoute><ResetPassword /></PublicRoute>} />

      {/* ── Change Password (both roles) ── */}
      <Route
        path="/change-password"
        element={
          <ProtectedRoute allowedRoles={['STUDENT', 'WARDEN']}>
            <ChangePassword />
          </ProtectedRoute>
        }
      />

      {/* ── Student Routes ── */}
      <Route
        path="/student/dashboard"
        element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>}
      />
      <Route
        path="/student/complaints"
        element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentComplaints /></ProtectedRoute>}
      />
      <Route
        path="/student/outpass"
        element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentOutpass /></ProtectedRoute>}
      />

      {/* ── Warden Routes ── */}
      <Route
        path="/warden/dashboard"
        element={<ProtectedRoute allowedRoles={['WARDEN']}><WardenDashboard /></ProtectedRoute>}
      />
      {/* Room Management (my module) */}
      <Route
        path="/warden/rooms"
        element={<ProtectedRoute allowedRoles={['WARDEN']}><RoomsPage /></ProtectedRoute>}
      />
      <Route
        path="/warden/rooms/:id"
        element={<ProtectedRoute allowedRoles={['WARDEN']}><RoomDetailPage /></ProtectedRoute>}
      />
      {/* Room Allocation (teammate's module) */}
      <Route
        path="/warden/allocations"
        element={<ProtectedRoute allowedRoles={['WARDEN']}><RoomAllocation /></ProtectedRoute>}
      />
      {/* Complaints (teammate's module) */}
      <Route
        path="/warden/complaints"
        element={<ProtectedRoute allowedRoles={['WARDEN']}><WardenComplaints /></ProtectedRoute>}
      />
      {/* Outpass (teammate's module) */}
      <Route
        path="/warden/outpass"
        element={<ProtectedRoute allowedRoles={['WARDEN']}><WardenOutpass /></ProtectedRoute>}
      />

      {/* ── Root redirect ── */}
      <Route
        path="/"
        element={
          isAuthenticated
            ? <Navigate to={user?.role === 'WARDEN' ? '/warden/dashboard' : '/student/dashboard'} replace />
            : <Navigate to="/login" replace />
        }
      />

      {/* ── Catch-all ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
