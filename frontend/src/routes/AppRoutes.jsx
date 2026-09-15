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
import WardenDashboard from '../pages/WardenDashboard';
import StudentFees from '../pages/StudentFees';
import StudentPayments from '../pages/StudentPayments';
import WardenFees from '../pages/WardenFees';
import RoomAllocation from '../pages/RoomAllocation';
import WardenComplaints from '../pages/WardenComplaints';
import StudentOutpass from '../pages/StudentOutpass';
import WardenOutpass from '../pages/WardenOutpass';

const AppRoutes = () => {
  const { isAuthenticated, user, loading } = useAuth();

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Redirect helper for authenticated users visiting public pages
  const PublicRoute = ({ children }) => {
    if (isAuthenticated) {
      // Redirect to appropriate dashboard based on role
      if (user?.role === 'WARDEN') {
        return <Navigate to="/warden/dashboard" replace />;
      }
      return <Navigate to="/student/dashboard" replace />;
    }
    return children;
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />
      <Route 
        path="/register" 
        element={
          <PublicRoute>
            <StudentRegister />
          </PublicRoute>
        } 
      />
      <Route 
        path="/forgot-password" 
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        } 
      />
      <Route 
        path="/reset-password" 
        element={
          <PublicRoute>
            <ResetPassword />
          </PublicRoute>
        } 
      />

      {/* Protected Routes - Change Password (both roles) */}
      <Route
        path="/change-password"
        element={
          <ProtectedRoute allowedRoles={['STUDENT', 'WARDEN']}>
            <ChangePassword />
          </ProtectedRoute>
        }
      />

      {/* Protected Routes - Student */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/fees"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentFees />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/complaints"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentComplaints />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/payments"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentPayments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/outpass"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentOutpass />
          </ProtectedRoute>
        }
      />

      {/* Protected Routes - Warden */}
      <Route
        path="/warden/dashboard"
        element={
          <ProtectedRoute allowedRoles={['WARDEN']}>
            <WardenDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/warden/fees"
        element={
          <ProtectedRoute allowedRoles={['WARDEN']}>
            <WardenFees />
          </ProtectedRoute>
        }
      />
      <Route
        path="/warden/allocations"
        element={
          <ProtectedRoute allowedRoles={['WARDEN']}>
            <RoomAllocation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/warden/complaints"
        element={
          <ProtectedRoute allowedRoles={['WARDEN']}>
            <WardenComplaints />
          </ProtectedRoute>
        }
      />
      <Route
        path="/warden/outpass"
        element={
          <ProtectedRoute allowedRoles={['WARDEN']}>
            <WardenOutpass />
          </ProtectedRoute>
        }
      />

      {/* Root redirect */}
      <Route 
        path="/" 
        element={
          isAuthenticated 
            ? <Navigate to={user?.role === 'WARDEN' ? '/warden/dashboard' : '/student/dashboard'} replace />
            : <Navigate to="/login" replace />
        } 
      />

      {/* Catch all - redirect to appropriate page */}
      <Route 
        path="*" 
        element={
          <Navigate to="/" replace />
        } 
      />
    </Routes>
  );
};

export default AppRoutes;
