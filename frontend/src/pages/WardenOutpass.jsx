import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import OutpassStatusBadge from '../components/OutpassStatusBadge';
import { outpassAPI } from '../services/api';
import {
  formatDate,
  formatDateTime,
  getApiErrorMessage
} from '../utils/outpassFormat';
import '../styles/dashboard.css';
import '../styles/outpass.css';

const TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'history', label: 'History' }
];

const fetchers = {
  pending: outpassAPI.getPending,
  approved: outpassAPI.getApproved,
  overdue: outpassAPI.getOverdue,
  history: outpassAPI.getAll
};

const WardenOutpass = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [data, setData] = useState({ pending: [], approved: [], overdue: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  // Details / reject modals
  const [selected, setSelected] = useState(null); // details view
  const [rejectTarget, setRejectTarget] = useState(null); // { id }
  const [rejectComment, setRejectComment] = useState('');
  const [rejectError, setRejectError] = useState('');

  const loadTab = useCallback(async (tab) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchers[tab]();
      setData((prev) => ({ ...prev, [tab]: res.data.outpasses || [] }));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load outpass requests.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab, loadTab]);

  const flash = (msg) => {
    setSuccess(msg);
    window.setTimeout(() => setSuccess(''), 4000);
  };

  const refreshCurrent = () => loadTab(activeTab);

  const handleApprove = async (id) => {
    setActionBusy(true);
    setError('');
    try {
      await outpassAPI.approve(id);
      flash('Outpass approved.');
      setSelected(null);
      await refreshCurrent();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to approve the outpass.'));
    } finally {
      setActionBusy(false);
    }
  };

  const handleReturn = async (id) => {
    setActionBusy(true);
    setError('');
    try {
      await outpassAPI.markReturned(id);
      flash('Student marked as returned.');
      setSelected(null);
      await refreshCurrent();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to mark as returned.'));
    } finally {
      setActionBusy(false);
    }
  };

  const submitReject = async () => {
    if (!rejectComment.trim()) {
      setRejectError('A rejection comment is required.');
      return;
    }
    setActionBusy(true);
    setRejectError('');
    try {
      await outpassAPI.reject(rejectTarget.id, rejectComment.trim());
      flash('Outpass rejected.');
      setRejectTarget(null);
      setRejectComment('');
      setSelected(null);
      await refreshCurrent();
    } catch (err) {
      setRejectError(getApiErrorMessage(err, 'Failed to reject the outpass.'));
    } finally {
      setActionBusy(false);
    }
  };

  const openDetails = async (id) => {
    setSelected({ loading: true });
    try {
      const res = await outpassAPI.getById(id);
      setSelected({ loading: false, data: res.data.outpass });
    } catch (err) {
      setSelected({ loading: false, error: getApiErrorMessage(err) });
    }
  };

  const list = data[activeTab] || [];
  const filtered = list.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (o.student?.name || '').toLowerCase().includes(q) ||
      (o.destination || '').toLowerCase().includes(q)
    );
  });

  const showApprove = activeTab === 'pending';
  const showReturn = activeTab === 'approved' || activeTab === 'overdue';

  return (
    <div className="dashboard-layout">
      <Sidebar userType="warden" />
      <div className="dashboard-main">
        <Navbar title="Outpass Management" />
        <main className="dashboard-content">
          <div className="outpass-header">
            <div className="welcome-section">
              <h1>Outpass Management</h1>
              <p className="welcome-subtitle">Review and manage student outpass requests</p>
            </div>
          </div>

          {success && <div className="op-success-banner">{success}</div>}
          {error && <div className="op-error-banner">{error}</div>}

          <div className="op-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`op-tab ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
                {data[t.id]?.length > 0 && (
                  <span className="op-tab-count">{data[t.id].length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="op-toolbar">
            <input
              className="op-search"
              type="text"
              placeholder="Search by student name or destination..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner large"></div>
              <p>Loading requests...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="op-state">
              <h3>No requests</h3>
              <p>There are no outpass requests in this view.</p>
            </div>
          ) : (
            <div className="op-table-wrap">
              <table className="op-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Destination</th>
                    <th>Leaving</th>
                    <th>Expected Return</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => (
                    <tr key={o.id}>
                      <td className="op-strong">{o.student?.name || '--'}</td>
                      <td>{o.destination}</td>
                      <td>{formatDateTime(o.leavingTime)}</td>
                      <td>{formatDateTime(o.expectedReturnTime)}</td>
                      <td><OutpassStatusBadge status={o.status} /></td>
                      <td>
                        <div className="op-cell-actions">
                          <button
                            className="op-btn op-btn-ghost op-btn-sm"
                            onClick={() => openDetails(o.id)}
                          >
                            View
                          </button>
                          {showApprove && (
                            <>
                              <button
                                className="op-btn op-btn-success op-btn-sm"
                                onClick={() => handleApprove(o.id)}
                                disabled={actionBusy}
                              >
                                Approve
                              </button>
                              <button
                                className="op-btn op-btn-danger op-btn-sm"
                                onClick={() => {
                                  setRejectTarget({ id: o.id });
                                  setRejectComment('');
                                  setRejectError('');
                                }}
                                disabled={actionBusy}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {showReturn && (
                            <button
                              className="op-btn op-btn-primary op-btn-sm"
                              onClick={() => handleReturn(o.id)}
                              disabled={actionBusy}
                            >
                              Mark Returned
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* Details modal */}
      {selected && (
        <div className="op-modal-overlay" onClick={() => setSelected(null)}>
          <div className="op-modal" onClick={(e) => e.stopPropagation()}>
            <div className="op-modal-header">
              <h2>Request Details</h2>
              <button className="op-modal-close" onClick={() => setSelected(null)} aria-label="Close">
                &times;
              </button>
            </div>
            <div className="op-modal-body">
              {selected.loading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Loading...</p>
                </div>
              ) : selected.error ? (
                <div className="op-error-banner">{selected.error}</div>
              ) : (
                <WardenOutpassDetails outpass={selected.data} />
              )}
            </div>
            <div className="op-modal-footer">
              {!selected.loading && !selected.error && selected.data && (
                <>
                  {selected.data.status === 'PENDING' && (
                    <>
                      <button
                        className="op-btn op-btn-danger"
                        onClick={() => {
                          setRejectTarget({ id: selected.data.id });
                          setRejectComment('');
                          setRejectError('');
                        }}
                        disabled={actionBusy}
                      >
                        Reject
                      </button>
                      <button
                        className="op-btn op-btn-success"
                        onClick={() => handleApprove(selected.data.id)}
                        disabled={actionBusy}
                      >
                        Approve
                      </button>
                    </>
                  )}
                  {['APPROVED', 'OVERDUE'].includes(selected.data.status) && (
                    <button
                      className="op-btn op-btn-primary"
                      onClick={() => handleReturn(selected.data.id)}
                      disabled={actionBusy}
                    >
                      Mark Returned
                    </button>
                  )}
                </>
              )}
              <button className="op-btn op-btn-ghost" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div className="op-modal-overlay" onClick={() => !actionBusy && setRejectTarget(null)}>
          <div className="op-modal" onClick={(e) => e.stopPropagation()}>
            <div className="op-modal-header">
              <h2>Reject Outpass</h2>
              <button
                className="op-modal-close"
                onClick={() => !actionBusy && setRejectTarget(null)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="op-modal-body">
              <div className="op-field full">
                <label>Rejection Comment <span className="req">*</span></label>
                <textarea
                  value={rejectComment}
                  onChange={(e) => {
                    setRejectComment(e.target.value);
                    setRejectError('');
                  }}
                  placeholder="Explain why this request is being rejected"
                  className={rejectError ? 'invalid' : ''}
                />
                {rejectError && <span className="op-field-error">{rejectError}</span>}
              </div>
            </div>
            <div className="op-modal-footer">
              <button
                className="op-btn op-btn-ghost"
                onClick={() => setRejectTarget(null)}
                disabled={actionBusy}
              >
                Cancel
              </button>
              <button className="op-btn op-btn-danger" onClick={submitReject} disabled={actionBusy}>
                {actionBusy ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const WardenOutpassDetails = ({ outpass }) => {
  if (!outpass) return null;
  const student = outpass.student || {};
  return (
    <>
      <div className="op-card-top" style={{ marginBottom: '0.5rem' }}>
        <span className="op-card-dest">{student.name || 'Student'}</span>
        <OutpassStatusBadge status={outpass.status} />
      </div>

      <div className="op-section-title">Student</div>
      <div className="op-details-grid">
        <div className="op-detail">
          <span className="op-label">Name</span>
          <span className="op-val">{student.name || '--'}</span>
        </div>
        <div className="op-detail">
          <span className="op-label">Phone</span>
          <span className="op-val">{student.phone || '--'}</span>
        </div>
        <div className="op-detail">
          <span className="op-label">Course</span>
          <span className="op-val">{student.course || '--'}</span>
        </div>
        <div className="op-detail">
          <span className="op-label">Year</span>
          <span className="op-val">{student.year || '--'}</span>
        </div>
        <div className="op-detail full">
          <span className="op-label">Email</span>
          <span className="op-val">{student.user?.email || '--'}</span>
        </div>
      </div>

      <div className="op-section-title">Outpass</div>
      <div className="op-details-grid">
        <div className="op-detail">
          <span className="op-label">Out Date</span>
          <span className="op-val">{formatDate(outpass.outDate)}</span>
        </div>
        <div className="op-detail">
          <span className="op-label">Emergency Contact</span>
          <span className="op-val">{outpass.emergencyContact || '--'}</span>
        </div>
        <div className="op-detail">
          <span className="op-label">Leaving Time</span>
          <span className="op-val">{formatDateTime(outpass.leavingTime)}</span>
        </div>
        <div className="op-detail">
          <span className="op-label">Expected Return</span>
          <span className="op-val">{formatDateTime(outpass.expectedReturnTime)}</span>
        </div>
        <div className="op-detail full">
          <span className="op-label">Destination</span>
          <span className="op-val">{outpass.destination}</span>
        </div>
        <div className="op-detail full">
          <span className="op-label">Reason</span>
          <span className="op-val">{outpass.reason}</span>
        </div>
      </div>

      <div className="op-section-title">Decision</div>
      <div className="op-details-grid">
        <div className="op-detail">
          <span className="op-label">Approved At</span>
          <span className="op-val">{outpass.approvedAt ? formatDateTime(outpass.approvedAt) : '--'}</span>
        </div>
        <div className="op-detail">
          <span className="op-label">Actual Return</span>
          <span className="op-val">
            {outpass.actualReturnTime ? formatDateTime(outpass.actualReturnTime) : '--'}
          </span>
        </div>
        <div className="op-detail full">
          <span className="op-label">Warden Comment</span>
          <span className="op-val">{outpass.wardenComment || '--'}</span>
        </div>
      </div>
    </>
  );
};

export default WardenOutpass;
