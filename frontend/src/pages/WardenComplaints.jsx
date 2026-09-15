import { useState, useEffect } from 'react';
import { wardenAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import '../styles/complaints.css';

const CATEGORIES = [
  { value: 'WATER', label: 'Water' },
  { value: 'ELECTRICITY', label: 'Electricity' },
  { value: 'FAN_AC', label: 'Fan / AC' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'WIFI', label: 'WiFi' },
  { value: 'FOOD', label: 'Food' },
  { value: 'OTHER', label: 'Other' }
];

const STATUS_LABELS = {
  OPEN: 'Pending',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected'
};

const STATUS_COLORS = {
  OPEN: 'warning',
  IN_PROGRESS: 'info',
  RESOLVED: 'success',
  REJECTED: 'error'
};

const WardenComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeView, setActiveView] = useState('list'); // 'list', 'detail'
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Update form
  const [updateStatus, setUpdateStatus] = useState('');
  const [wardenResponse, setWardenResponse] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchComplaints();
    fetchStats();
  }, [filterStatus, filterCategory]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const response = await wardenAPI.getComplaints(params);
      setComplaints(response.data);
    } catch (err) {
      console.error('Fetch complaints error:', err);
      setError('Failed to load complaints.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await wardenAPI.getComplaintStats();
      setStats(response.data);
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchComplaints();
  };

  const viewComplaint = async (id) => {
    try {
      const response = await wardenAPI.getComplaintById(id);
      setSelectedComplaint(response.data);
      setUpdateStatus(response.data.status);
      setWardenResponse(response.data.wardenResponse || '');
      setActiveView('detail');
      setError('');
      setSuccessMsg('');
    } catch (err) {
      setError('Failed to load complaint details.');
    }
  };

  const handleUpdate = async () => {
    if (!selectedComplaint) return;
    setError('');
    setSuccessMsg('');

    const data = {};
    if (updateStatus !== selectedComplaint.status) {
      data.status = updateStatus;
    }
    if (wardenResponse.trim() !== (selectedComplaint.wardenResponse || '')) {
      data.wardenResponse = wardenResponse.trim();
    }

    if (Object.keys(data).length === 0) {
      setError('No changes to update.');
      return;
    }

    try {
      setUpdating(true);
      const response = await wardenAPI.updateComplaint(selectedComplaint.id, data);
      setSuccessMsg('Complaint updated successfully!');
      setSelectedComplaint(response.data.complaint);
      // Refresh list and stats
      fetchComplaints();
      fetchStats();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update complaint.');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryLabel = (val) => {
    const cat = CATEGORIES.find(c => c.value === val);
    return cat ? cat.label : val;
  };

  const getStudentRoom = (student) => {
    if (student?.allocations?.[0]?.room?.roomNumber) {
      return student.allocations[0].room.roomNumber;
    }
    return '--';
  };

  // ==================== RENDER SECTIONS ====================

  const renderStats = () => {
    if (!stats) return null;
    return (
      <div className="stats-cards">
        <div className="stat-card">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-title">Total</span>
        </div>
        <div className="stat-card stat-warning">
          <span className="stat-number">{stats.open}</span>
          <span className="stat-title">Pending</span>
        </div>
        <div className="stat-card stat-info">
          <span className="stat-number">{stats.inProgress}</span>
          <span className="stat-title">In Progress</span>
        </div>
        <div className="stat-card stat-success">
          <span className="stat-number">{stats.resolved}</span>
          <span className="stat-title">Resolved</span>
        </div>
        <div className="stat-card stat-error">
          <span className="stat-number">{stats.rejected}</span>
          <span className="stat-title">Rejected</span>
        </div>
      </div>
    );
  };

  const renderDetail = () => {
    if (!selectedComplaint) return null;
    const c = selectedComplaint;
    const student = c.student;

    return (
      <div className="complaints-section">
        <div className="section-header">
          <h2>Complaint #{c.id}</h2>
          <button className="btn btn-secondary" onClick={() => { setActiveView('list'); setError(''); setSuccessMsg(''); }}>
            ← Back to List
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {successMsg && <div className="alert alert-success">{successMsg}</div>}

        <div className="detail-layout">
          {/* Complaint Info */}
          <div className="complaint-detail-card">
            <div className="detail-header">
              <h3>{c.title}</h3>
              <span className={`status-badge status-${STATUS_COLORS[c.status]}`}>
                {STATUS_LABELS[c.status]}
              </span>
            </div>

            <div className="detail-meta">
              <div className="meta-item">
                <span className="meta-label">Category</span>
                <span className="meta-value">{getCategoryLabel(c.category)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Submitted</span>
                <span className="meta-value">{formatDate(c.createdAt)}</span>
              </div>
              {c.resolvedAt && (
                <div className="meta-item">
                  <span className="meta-label">Resolved</span>
                  <span className="meta-value">{formatDate(c.resolvedAt)}</span>
                </div>
              )}
            </div>

            <div className="detail-body">
              <h4>Description</h4>
              <p>{c.description}</p>
            </div>

            {/* Student Info */}
            {student && (
              <div className="detail-student">
                <h4>Student Information</h4>
                <div className="student-info-grid">
                  <div className="info-pair">
                    <span className="meta-label">Name</span>
                    <span className="meta-value">{student.name}</span>
                  </div>
                  <div className="info-pair">
                    <span className="meta-label">Email</span>
                    <span className="meta-value">{student.user?.email || '--'}</span>
                  </div>
                  <div className="info-pair">
                    <span className="meta-label">Phone</span>
                    <span className="meta-value">{student.phone || '--'}</span>
                  </div>
                  <div className="info-pair">
                    <span className="meta-label">Room</span>
                    <span className="meta-value">{getStudentRoom(student)}</span>
                  </div>
                  <div className="info-pair">
                    <span className="meta-label">Course</span>
                    <span className="meta-value">{student.course || '--'}{student.year ? ` (Year ${student.year})` : ''}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Panel */}
          <div className="action-panel">
            <h4>Update Complaint</h4>

            <div className="form-group">
              <label htmlFor="updateStatus">Status</label>
              <select
                id="updateStatus"
                value={updateStatus}
                onChange={(e) => setUpdateStatus(e.target.value)}
              >
                <option value="OPEN">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="wardenResponse">Response / Comment</label>
              <textarea
                id="wardenResponse"
                value={wardenResponse}
                onChange={(e) => setWardenResponse(e.target.value)}
                placeholder="Add your response or comment..."
                rows={4}
                maxLength={2000}
              />
              <span className="char-count">{wardenResponse.length}/2000</span>
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={handleUpdate}
              disabled={updating}
            >
              {updating ? 'Updating...' : 'Update Complaint'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderList = () => (
    <div className="complaints-section">
      <div className="section-header">
        <h2>Complaints Management</h2>
      </div>

      {renderStats()}

      <div className="filter-bar">
        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID, student name, or title..."
            className="search-input"
          />
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
        </form>
        <div className="filter-group">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="OPEN">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="filter-select"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
        <span className="results-count">{complaints.length} complaint{complaints.length !== 1 ? 's' : ''}</span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner large"></div>
          <p>Loading complaints...</p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="empty-state">
          <p>No complaints found matching your criteria.</p>
        </div>
      ) : (
        <div className="complaints-table-wrapper">
          <table className="complaints-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Student</th>
                <th>Room</th>
                <th>Title</th>
                <th>Category</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map(c => (
                <tr key={c.id}>
                  <td>#{c.id}</td>
                  <td>{c.student?.name || '--'}</td>
                  <td>{getStudentRoom(c.student)}</td>
                  <td className="title-cell">{c.title}</td>
                  <td>{getCategoryLabel(c.category)}</td>
                  <td>{formatDate(c.createdAt)}</td>
                  <td>
                    <span className={`status-badge status-${STATUS_COLORS[c.status]}`}>
                      {STATUS_LABELS[c.status]}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-secondary" onClick={() => viewComplaint(c.id)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="dashboard-layout">
      <Sidebar userType="warden" />
      <div className="dashboard-main">
        <Navbar title="Complaints Management" />
        <main className="dashboard-content">
          {activeView === 'detail' ? renderDetail() : renderList()}
        </main>
      </div>
    </div>
  );
};

export default WardenComplaints;
