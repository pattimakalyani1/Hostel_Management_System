import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { studentAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import '../styles/profile.css';

const StudentProfile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Profile endpoint returns full details incl. address; dashboard gives room.
      const [profileRes, dashboardRes] = await Promise.all([
        studentAPI.getProfile(),
        studentAPI.getDashboard()
      ]);
      const profile = profileRes.data;

      setProfileData(profile);
      setRoomData(dashboardRes.data.room);

      setFormData({
        name: profile?.name || '',
        phone: profile?.phone || '',
        address: profile?.address || ''
      });
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      await studentAPI.updateProfile(formData);
      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false);
      fetchData(); // Refresh data
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: profileData?.name || '',
      phone: profileData?.phone || '',
      address: profileData?.address || ''
    });
    setIsEditing(false);
    setError('');
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar userType="student" />
        <div className="dashboard-main">
          <Navbar title="My Profile" />
          <main className="dashboard-content">
            <div className="loading-state">
              <div className="loading-spinner large"></div>
              <p>Loading profile...</p>
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
        <Navbar title="My Profile" />
        <main className="dashboard-content">
          <div className="profile-container">
            {error && (
              <div className="profile-error">
                {error}
              </div>
            )}
            
            {successMessage && (
              <div className="profile-success">
                {successMessage}
              </div>
            )}

            {/* Profile Card */}
            <div className="profile-card">
              <div className="profile-card-header">
                <div className="profile-avatar">
                  {profileData?.name?.charAt(0).toUpperCase() || 'S'}
                </div>
                <div className="profile-header-info">
                  <h2>{profileData?.name || 'Student'}</h2>
                  <p>{profileData?.email}</p>
                </div>
                {!isEditing && (
                  <button className="edit-btn" onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </button>
                )}
              </div>

              <div className="profile-card-body">
                <h3>Personal Information</h3>
                
                {isEditing ? (
                  <div className="profile-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Full Name</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Enter your name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Phone</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>
                    <div className="form-group full-width">
                      <label>Address</label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Enter your address"
                        rows="3"
                      />
                    </div>
                    <div className="form-actions">
                      <button 
                        className="cancel-btn" 
                        onClick={handleCancel}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button 
                        className="save-btn" 
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="profile-info-grid">
                    <div className="profile-info-item">
                      <span className="label">Full Name</span>
                      <span className="value">{profileData?.name || '--'}</span>
                    </div>
                    <div className="profile-info-item">
                      <span className="label">Email</span>
                      <span className="value">{profileData?.email || '--'}</span>
                    </div>
                    <div className="profile-info-item">
                      <span className="label">Phone</span>
                      <span className="value">{profileData?.phone || '--'}</span>
                    </div>
                    <div className="profile-info-item">
                      <span className="label">Member Since</span>
                      <span className="value">
                        {profileData?.memberSince 
                          ? new Date(profileData.memberSince).toLocaleDateString() 
                          : '--'}
                      </span>
                    </div>
                    <div className="profile-info-item full-width">
                      <span className="label">Address</span>
                      <span className="value">{profileData?.address || '--'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Room & Bed Card */}
            <div className="profile-card">
              <div className="profile-card-body">
                <h3>Room & Bed Details</h3>
                
                {roomData ? (
                  <div className="room-details">
                    <div className="room-info-grid">
                      <div className="room-info-item highlight">
                        <span className="label">Room Number</span>
                        <span className="value large">{roomData.roomNumber}</span>
                      </div>
                      <div className="room-info-item highlight">
                        <span className="label">Bed Number</span>
                        <span className="value large">{roomData.bedNumber}</span>
                      </div>
                      <div className="room-info-item">
                        <span className="label">Floor</span>
                        <span className="value">{roomData.floor}</span>
                      </div>
                      <div className="room-info-item">
                        <span className="label">Room Type</span>
                        <span className="value">{roomData.roomType || 'Standard'}</span>
                      </div>
                      <div className="room-info-item">
                        <span className="label">Allocation Status</span>
                        <span className={`value status ${roomData.status?.toLowerCase()}`}>
                          {roomData.status || 'Active'}
                        </span>
                      </div>
                      <div className="room-info-item">
                        <span className="label">Allocated On</span>
                        <span className="value">
                          {roomData.allocatedDate 
                            ? new Date(roomData.allocatedDate).toLocaleDateString() 
                            : '--'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="no-room">
                    <div className="no-room-icon">🏠</div>
                    <h4>No Room Allocated</h4>
                    <p>You have not been allocated a room yet. Please contact the hostel warden for room allocation.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentProfile;
