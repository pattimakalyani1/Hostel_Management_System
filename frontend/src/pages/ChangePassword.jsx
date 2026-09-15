import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import '../styles/auth.css';
import '../styles/dashboard.css';

const ChangePassword = () => {
  const navigate = useNavigate();
  const { user, changePassword } = useAuth();
  
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const userType = user?.role === 'WARDEN' ? 'warden' : 'student';

  const validateForm = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    } else if (!/\d/.test(formData.newPassword)) {
      newErrors.newPassword = 'Password must contain at least one number';
    } else if (formData.newPassword === formData.currentPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    if (!formData.confirmNewPassword) {
      newErrors.confirmNewPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmNewPassword) {
      newErrors.confirmNewPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (serverError) setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await changePassword(
        formData.currentPassword,
        formData.newPassword,
        formData.confirmNewPassword
      );
      setSuccess(true);
      // Reset form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      });
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to change password. Please try again.';
      setServerError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    if (userType === 'warden') {
      navigate('/warden/dashboard');
    } else {
      navigate('/student/dashboard');
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar userType={userType} />
      <div className="dashboard-main">
        <Navbar title="Change Password" />
        <main className="dashboard-content">
          <div className="change-password-container">
            <div className="change-password-card">
              <div className="card-header">
                <h2>Change Password</h2>
                <p>Update your account password</p>
              </div>

              {success && (
                <div className="auth-success">
                  <span className="success-icon">✓</span>
                  Password changed successfully!
                </div>
              )}

              {serverError && (
                <div className="auth-error">
                  <span className="error-icon">⚠️</span>
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    placeholder="Enter current password"
                    className={errors.currentPassword ? 'error' : ''}
                    disabled={loading}
                  />
                  {errors.currentPassword && <span className="field-error">{errors.currentPassword}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder="Enter new password"
                    className={errors.newPassword ? 'error' : ''}
                    disabled={loading}
                  />
                  {errors.newPassword && <span className="field-error">{errors.newPassword}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="confirmNewPassword">Confirm New Password</label>
                  <input
                    type="password"
                    id="confirmNewPassword"
                    name="confirmNewPassword"
                    value={formData.confirmNewPassword}
                    onChange={handleChange}
                    placeholder="Confirm new password"
                    className={errors.confirmNewPassword ? 'error' : ''}
                    disabled={loading}
                  />
                  {errors.confirmNewPassword && <span className="field-error">{errors.confirmNewPassword}</span>}
                </div>

                <p className="password-hint">
                  Password must be at least 6 characters and contain at least one number.
                </p>

                <div className="button-group">
                  <button 
                    type="button" 
                    className="auth-btn secondary"
                    onClick={handleBackToDashboard}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="auth-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="btn-loading">
                        <span className="spinner"></span>
                        Updating...
                      </span>
                    ) : (
                      'Change Password'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ChangePassword;
