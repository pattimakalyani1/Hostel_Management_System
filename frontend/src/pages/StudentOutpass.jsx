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

const emptyForm = {
  outDate: '',
  leavingTime: '',
  expectedReturnTime: '',
  destination: '',
  reason: '',
  emergencyContact: ''
};

const STATUS_FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'RETURNED', 'OVERDUE'];

const StudentOutpass = () => {
  const [outpasses, setOutpasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Apply modal
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Details modal
  const [selected, setSelected] = useState(null);

  const fetchOutpasses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await outpassAPI.getMine();
      setOutpasses(res.data.outpasses || []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load your outpass requests.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOutpasses();
  }, [fetchOutpasses]);

  const openForm = () => {
    setForm(emptyForm);
    setFormErrors({});
    setError('');
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validateForm = () => {
    const errs = {};
    const now = new Date();

    if (!form.outDate) errs.outDate = 'Out date is required';
    if (!form.leavingTime) errs.leavingTime = 'Leaving time is required';
    if (!form.expectedReturnTime) errs.expectedReturnTime = 'Expected return time is required';
    if (!form.destination.trim()) errs.destination = 'Destination is required';
    if (!form.reason.trim()) errs.reason = 'Reason is required';

    if (form.leavingTime) {
      const leaving = new Date(form.leavingTime);
      if (leaving < now) errs.leavingTime = 'Leaving time cannot be in the past';
    }
    if (form.leavingTime && form.expectedReturnTime) {
      const leaving = new Date(form.leavingTime);
      const ret = new Date(form.expectedReturnTime);
      if (ret <= leaving) {
        errs.expectedReturnTime = 'Return time must be after the leaving time';
      }
    }
    if (form.emergencyContact.trim()) {
      const digits = form.emergencyContact.replace(/[\s-]/g, '');
      if (!/^\+?\d{7,15}$/.test(digits)) {
        errs.emergencyContact = 'Enter a valid phone number';
      }
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // prevent duplicate submissions
    if (!validateForm()) return;

    setSubmitting(true);
    setError('');
    try {
      // Convert datetime-local / date inputs to ISO strings.
      const payload = {
        outDate: new Date(form.outDate).toISOString(),
        leavingTime: new Date(form.leavingTime).toISOString(),
        expectedReturnTime: new Date(form.expectedReturnTime).toISOString(),
        destination: form.destination.trim(),
        reason: form.reason.trim(),
        emergencyContact: form.emergencyContact.trim() || undefined
      };
      await outpassAPI.create(payload);
      setShowForm(false);
      setSuccess('Outpass request submitted successfully.');
      setForm(emptyForm);
      await fetchOutpasses();
      window.setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to submit your outpass request.'));
    } finally {
      setSubmitting(false);
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

  const filtered = outpasses.filter((o) => {
    if (filter !== 'ALL' && o.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (o.destination || '').toLowerCase().includes(q) ||
        (o.reason || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = STATUS_FILTERS.reduce((acc, s) => {
    acc[s] = s === 'ALL' ? outpasses.length : outpasses.filter((o) => o.status === s).length;
    return acc;
  }, {});

  return (
    <div className="dashboard-layout">
      <Sidebar userType="student" />
      <div className="dashboard-main">
        <Navbar title="Outpass Management" />
        <main className="dashboard-content">
          <div className="outpass-header">
            <div className="welcome-section">
              <h1>Outpass Management</h1>
              <p className="welcome-subtitle">Apply for leave and track your requests</p>
            </div>
            <button className="op-btn op-btn-primary" onClick={openForm}>
              + Apply for Outpass
            </button>
          </div>

          {success && <div className="op-success-banner">{success}</div>}
          {error && <div className="op-error-banner">{error}</div>}

          {/* Filters */}
          <div className="op-tabs">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                className={`op-tab ${filter === s ? 'active' : ''}`}
                onClick={() => setFilter(s)}
              >
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                <span className="op-tab-count">{counts[s] || 0}</span>
              </button>
            ))}
          </div>

          <div className="op-toolbar">
            <input
              className="op-search"
              type="text"
              placeholder="Search by destination or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Content states */}
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner large"></div>
              <p>Loading your outpasses...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="op-state">
              <h3>No outpass requests</h3>
              <p>
                {outpasses.length === 0
                  ? 'You have not applied for any outpass yet. Click "Apply for Outpass" to get started.'
                  : 'No requests match your current filter.'}
              </p>
            </div>
          ) : (
            <div className="op-card-grid">
              {filtered.map((o) => (
                <div
                  key={o.id}
                  className={`op-card ${o.status === 'OVERDUE' ? 'op-overdue-flag' : ''}`}
                >
                  <div className="op-card-top">
                    <span className="op-card-dest">{o.destination}</span>
                    <OutpassStatusBadge status={o.status} />
                  </div>
                  <div className="op-card-row">
                    <span className="op-label">Out Date</span>
                    <span className="op-val">{formatDate(o.outDate)}</span>
                  </div>
                  <div className="op-card-row">
                    <span className="op-label">Leaving</span>
                    <span className="op-val">{formatDateTime(o.leavingTime)}</span>
                  </div>
                  <div className="op-card-row">
                    <span className="op-label">Expected Return</span>
                    <span className="op-val">{formatDateTime(o.expectedReturnTime)}</span>
                  </div>
                  {o.status === 'REJECTED' && o.wardenComment && (
                    <div className="op-card-row">
                      <span className="op-label">Reason</span>
                      <span className="op-val">{o.wardenComment}</span>
                    </div>
                  )}
                  <div className="op-card-actions">
                    <button
                      className="op-btn op-btn-ghost op-btn-sm"
                      onClick={() => openDetails(o.id)}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Apply modal */}
      {showForm && (
        <div className="op-modal-overlay" onClick={() => !submitting && setShowForm(false)}>
          <div className="op-modal" onClick={(e) => e.stopPropagation()}>
            <div className="op-modal-header">
              <h2>Apply for Outpass</h2>
              <button
                className="op-modal-close"
                onClick={() => !submitting && setShowForm(false)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="op-modal-body">
                <div className="op-form-grid">
                  <div className="op-field">
                    <label>Out Date <span className="req">*</span></label>
                    <input
                      type="date"
                      name="outDate"
                      value={form.outDate}
                      onChange={handleChange}
                      className={formErrors.outDate ? 'invalid' : ''}
                    />
                    {formErrors.outDate && <span className="op-field-error">{formErrors.outDate}</span>}
                  </div>
                  <div className="op-field">
                    <label>Emergency Contact</label>
                    <input
                      type="tel"
                      name="emergencyContact"
                      placeholder="Optional"
                      value={form.emergencyContact}
                      onChange={handleChange}
                      className={formErrors.emergencyContact ? 'invalid' : ''}
                    />
                    {formErrors.emergencyContact && (
                      <span className="op-field-error">{formErrors.emergencyContact}</span>
                    )}
                  </div>
                  <div className="op-field">
                    <label>Leaving Time <span className="req">*</span></label>
                    <input
                      type="datetime-local"
                      name="leavingTime"
                      value={form.leavingTime}
                      onChange={handleChange}
                      className={formErrors.leavingTime ? 'invalid' : ''}
                    />
                    {formErrors.leavingTime && (
                      <span className="op-field-error">{formErrors.leavingTime}</span>
                    )}
                  </div>
                  <div className="op-field">
                    <label>Expected Return Time <span className="req">*</span></label>
                    <input
                      type="datetime-local"
                      name="expectedReturnTime"
                      value={form.expectedReturnTime}
                      onChange={handleChange}
                      className={formErrors.expectedReturnTime ? 'invalid' : ''}
                    />
                    {formErrors.expectedReturnTime && (
                      <span className="op-field-error">{formErrors.expectedReturnTime}</span>
                    )}
                  </div>
                  <div className="op-field full">
                    <label>Destination <span className="req">*</span></label>
                    <input
                      type="text"
                      name="destination"
                      placeholder="Where are you going?"
                      value={form.destination}
                      onChange={handleChange}
                      className={formErrors.destination ? 'invalid' : ''}
                    />
                    {formErrors.destination && (
                      <span className="op-field-error">{formErrors.destination}</span>
                    )}
                  </div>
                  <div className="op-field full">
                    <label>Reason <span className="req">*</span></label>
                    <textarea
                      name="reason"
                      placeholder="Reason for the outpass"
                      value={form.reason}
                      onChange={handleChange}
                      className={formErrors.reason ? 'invalid' : ''}
                    />
                    {formErrors.reason && <span className="op-field-error">{formErrors.reason}</span>}
                  </div>
                </div>
              </div>
              <div className="op-modal-footer">
                <button
                  type="button"
                  className="op-btn op-btn-ghost"
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="op-btn op-btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details modal */}
      {selected && (
        <div className="op-modal-overlay" onClick={() => setSelected(null)}>
          <div className="op-modal" onClick={(e) => e.stopPropagation()}>
            <div className="op-modal-header">
              <h2>Outpass Details</h2>
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
                <StudentOutpassDetails outpass={selected.data} />
              )}
            </div>
            <div className="op-modal-footer">
              <button className="op-btn op-btn-ghost" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StudentOutpassDetails = ({ outpass }) => {
  if (!outpass) return null;
  return (
    <>
      <div className="op-card-top" style={{ marginBottom: '1rem' }}>
        <span className="op-card-dest">{outpass.destination}</span>
        <OutpassStatusBadge status={outpass.status} />
      </div>
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

export default StudentOutpass;
