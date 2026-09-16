import { useState, useEffect } from 'react';
import { wardenAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import DashboardCard from '../components/DashboardCard';
import '../styles/dashboard.css';
import '../styles/students.css';

const WardenStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '' });
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [pagination.page, filters]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: 15,
        ...(search && { search }),
        ...(filters.status && { status: filters.status })
      };
      const res = await wardenAPI.getStudents(params);
      setStudents(res.data.students);
      setPagination(prev => ({
        ...prev,
        total: res.data.pagination.total,
        totalPages: res.data.pagination.totalPages
      }));
    } catch (err) {
      console.error('Fetch students error:', err);
      setError('Failed to load students. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchStudents();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleClearFilters = () => {
    setSearch('');
    setFilters({ status: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const viewStudentDetails = async (id) => {
    try {
      setDetailLoading(true);
      const res = await wardenAPI.getStudentById(id);
      setSelectedStudent(res.data.student);
    } catch (err) {
      console.error('Fetch student detail error:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedStudent(null);
  };

  const handleDeleteClick = (student) => {
    setDeleteConfirm(student);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      setDeleting(true);
      await wardenAPI.deleteStudent(deleteConfirm.id);
      setDeleteConfirm(null);
      // Close detail modal if open for this student
      if (selectedStudent && selectedStudent.id === deleteConfirm.id) {
        setSelectedStudent(null);
      }
      fetchStudents();
    } catch (err) {
      console.error('Delete student error:', err);
      setError('Failed to delete student. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Delete confirmation modal
  const renderDeleteModal = () => {
    if (!deleteConfirm) return null;
    return (
      <div className="student-modal-overlay" onClick={handleDeleteCancel}>
        <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
          <div className="delete-modal-icon">⚠️</div>
          <h3>Delete Student</h3>
          <p>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?</p>
          <p className="delete-warning">This will permanently remove the student account and all associated data.</p>
          <div className="delete-modal-actions">
            <button className="btn btn-outline btn-sm" onClick={handleDeleteCancel} disabled={deleting}>
              Cancel
            </button>
            <button className="btn btn-danger btn-sm" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Detail modal
  const renderDetailModal = () => {
    if (!selectedStudent) return null;
    const s = selectedStudent;

    return (
      <div className="student-modal-overlay" onClick={closeDetail}>
        <div className="student-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{s.name}</h2>
            <button className="modal-close" onClick={closeDetail} aria-label="Close">&times;</button>
          </div>

          {detailLoading ? (
            <div className="loading-state"><div className="loading-spinner"></div><p>Loading...</p></div>
          ) : (
            <div className="modal-body">
              {/* Basic Info */}
              <div className="detail-section">
                <h3>Personal Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Name</span>
                    <span className="detail-value">{s.name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Email</span>
                    <span className="detail-value">{s.email}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Phone</span>
                    <span className="detail-value">{s.phone}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Address</span>
                    <span className="detail-value">{s.address}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Course</span>
                    <span className="detail-value">{s.course}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Year</span>
                    <span className="detail-value">{s.year}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status</span>
                    <span className={`status-badge ${s.isActive ? 'active' : 'inactive'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Joined</span>
                    <span className="detail-value">{formatDate(s.joinedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Room Info */}
              <div className="detail-section">
                <h3>Room Allocation</h3>
                {s.room ? (
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Room</span>
                      <span className="detail-value">{s.room.roomNumber}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Floor</span>
                      <span className="detail-value">{s.room.floor}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Bed</span>
                      <span className="detail-value">{s.room.bedNumber}</span>
                    </div>
                    {s.room.roomType && (
                      <div className="detail-item">
                        <span className="detail-label">Type</span>
                        <span className="detail-value">{s.room.roomType}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="no-data">No room allocated</p>
                )}
              </div>

              {/* Recent Complaints */}
              {s.recentComplaints && s.recentComplaints.length > 0 && (
                <div className="detail-section">
                  <h3>Recent Complaints</h3>
                  <div className="detail-table-wrap">
                    <table className="detail-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Category</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.recentComplaints.map(c => (
                          <tr key={c.id}>
                            <td>{c.title}</td>
                            <td>{c.category}</td>
                            <td><span className={`status-badge ${c.status.toLowerCase()}`}>{c.status}</span></td>
                            <td>{formatDate(c.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recent Fees */}
              {s.recentFees && s.recentFees.length > 0 && (
                <div className="detail-section">
                  <h3>Recent Fees</h3>
                  <div className="detail-table-wrap">
                    <table className="detail-table">
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Due Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.recentFees.map(f => (
                          <tr key={f.id}>
                            <td>{f.description || '--'}</td>
                            <td>₹{parseFloat(f.amount).toLocaleString()}</td>
                            <td><span className={`status-badge ${f.status.toLowerCase()}`}>{f.status}</span></td>
                            <td>{formatDate(f.dueDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recent Outpasses */}
              {s.recentOutpasses && s.recentOutpasses.length > 0 && (
                <div className="detail-section">
                  <h3>Recent Outpasses</h3>
                  <div className="detail-table-wrap">
                    <table className="detail-table">
                      <thead>
                        <tr>
                          <th>Reason</th>
                          <th>From</th>
                          <th>To</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.recentOutpasses.map(o => (
                          <tr key={o.id}>
                            <td>{o.reason}</td>
                            <td>{formatDate(o.fromDate)}</td>
                            <td>{formatDate(o.toDate)}</td>
                            <td><span className={`status-badge ${o.status.toLowerCase()}`}>{o.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-layout">
      <Sidebar userType="warden" />
      <div className="dashboard-main">
        <Navbar title="Students Management" />
        <main className="dashboard-content">
          <div className="dashboard-header">
            <div className="welcome-section">
              <h1>Students</h1>
              <p className="welcome-subtitle">Manage all registered students</p>
            </div>
          </div>

          {/* Total count card */}
          <section className="dashboard-cards" style={{ marginBottom: '1.5rem' }}>
            <DashboardCard
              title="Total Students"
              value={pagination.total}
              color="primary"
              subtitle="Registered students"
            />
          </section>

          {error && <div className="dashboard-error">{error}</div>}

          {/* Search & Filters */}
          <div className="students-toolbar">
            <form className="search-form" onSubmit={handleSearch}>
              <input
                type="text"
                className="search-input"
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-sm">Search</button>
            </form>

            <div className="filter-group">
              <select
                className="filter-select"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              {(search || filters.status) && (
                <button className="btn btn-outline btn-sm" onClick={handleClearFilters}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Students Table */}
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner large"></div>
              <p>Loading students...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="empty-state">
              <p>No students found</p>
              <span className="empty-hint">Try adjusting your search or filters</span>
            </div>
          ) : (
            <>
              <div className="students-table-wrap">
                <table className="students-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Address</th>
                      <th>Room</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, idx) => (
                      <tr key={student.id}>
                        <td>{(pagination.page - 1) * 15 + idx + 1}</td>
                        <td className="student-name">{student.name}</td>
                        <td>{student.email}</td>
                        <td>{student.phone}</td>
                        <td className="address-cell">{student.address}</td>
                        <td>
                          {student.room
                            ? `${student.room.roomNumber} / Bed ${student.room.bedNumber}`
                            : <span className="no-data">Not allocated</span>
                          }
                        </td>
                        <td>
                          <span className={`status-badge ${student.isActive ? 'active' : 'inactive'}`}>
                            {student.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn btn-outline btn-xs"
                              onClick={() => viewStudentDetails(student.id)}
                            >
                              View
                            </button>
                            <button
                              className="btn btn-danger btn-xs"
                              onClick={() => handleDeleteClick(student)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Previous
                  </button>
                  <span className="pagination-info">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}

          {renderDetailModal()}
          {renderDeleteModal()}
        </main>
      </div>
    </div>
  );
};

export default WardenStudents;
