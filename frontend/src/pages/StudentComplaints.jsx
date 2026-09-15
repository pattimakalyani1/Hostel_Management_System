import { useState, useEffect } from 'react';
import { studentAPI } from '../services/api';
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

const StudentComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'create', 'detail'
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: ''
  });

  useEffect(() => {
    fetchComplaints();
  }, [filterStatus]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const response = await studentAPI.getComplaints(params);
      setComplaints(response.data);
    } catch (err) {
      console.error('Fetch complaints error:', err);
      setError('Failed to load complaints.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!form.title.trim() || !form.description.trim() || !form.category) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setSubmitting(true);
      await studentAPI.createComplaint(form);
      setSuccessMsg('Complaint submitted successfully!');
      setForm({ title: '', description: '', category: '' });
      // Switch to list and refresh
      setTimeout(() => {
        setSuccessMsg('');
        setActiveTab('list');
        fetchComplaints();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  const viewComplaint = async (id) => {
    try {
      const response = await studentAPI.getComplaintById(id);
      setSelectedComplaint(response.data);
      setActiveTab('detail');
    } catch (err) {
      setError('Failed to load complaint details.');
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

  // ==================== RENDER SECTIONS ====================

  const renderCreateForm = () => (
    <div className="complaints-section">
      <div className="section-header">
        <h2>Raise a Complaint</h2>
        <button className="btn btn-secondary" onClick={() => { setActiveTab('list'); setError(''); setSuccessMsg(''); }}>
          ← Back to List
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <form className="complaint-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Complaint Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={form.title}
            onChange={handleFormChange}
            placeholder="Brief title of your complaint"
            maxLength={200}
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={form.category}
            onChange={handleFormChange}
          >
            <option value="">Select a category</option>
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleFormChange}
            placeholder="Describe your complaint in detail..."
            rows={5}
            maxLength={2000}
          />
          <span className="char-count">{form.description.length}/2000</span>
        </div>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Complaint'}
        </button>
      </form>
    </div>
  );

  const renderComplaintDetail = () => {
    if (!selectedComplaint) return null;
    const c = selectedComplaint;

    return (
      <div className="complaints-section">
        <div className="section-header">
          <h2>Complaint #{c.id}</h2>
          <button className="btn btn-secondary" onClick={() => setActiveTab('list')}>
            ← Back to List
          </button>
        </div>

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

          {c.wardenResponse && (
            <div className="detail-response">
              <h4>Warden Response</h4>
              <p>{c.wardenResponse}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderComplaintsList = () => (
    <div className="complaints-section">
      <div className="section-header">
        <h2>My Complaints</h2>
        <button className="btn btn-primary" onClick={() => { setActiveTab('create'); setError(''); }}>
          + Raise Complaint
        </button>
      </div>

      <div className="filter-bar">
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
        <span className="results-count">{complaints.length} complaint{complaints.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner large"></div>
          <p>Loading complaints...</p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="empty-state">
          <p>No complaints found.</p>
          <button className="btn btn-primary" onClick={() => setActiveTab('create')}>
            Raise your first complaint
          </button>
        </div>
      ) : (
        <div className="complaints-table-wrapper">
          <table className="complaints-table">
            <thead>
              <tr>
                <th>ID</th>
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
      <Sidebar userType="student" />
      <div className="dashboard-main">
        <Navbar title="My Complaints" />
        <main className="dashboard-content">
          {activeTab === 'create' && renderCreateForm()}
          {activeTab === 'detail' && renderComplaintDetail()}
          {activeTab === 'list' && renderComplaintsList()}
        </main>
      </div>
    </div>
  );
};

export default StudentComplaints;
