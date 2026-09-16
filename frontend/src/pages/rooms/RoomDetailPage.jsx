import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import { roomsAPI } from '../../services/roomsApi';
import './rooms.css';

const STATUS_META = {
  AVAILABLE:          { label: 'Available',          cls: 'badge-success'     },
  PARTIALLY_OCCUPIED: { label: 'Partially Occupied', cls: 'badge-warning'     },
  FULL:               { label: 'Full',               cls: 'badge-error'       },
  MAINTENANCE:        { label: 'Maintenance',        cls: 'badge-maintenance' },
};

const BED_STATUS_META = {
  OCCUPIED:    { label: 'Occupied',    cls: 'badge-occupied'    },
  AVAILABLE:   { label: 'Available',   cls: 'badge-success'     },
  MAINTENANCE: { label: 'Maintenance', cls: 'badge-maintenance' },
};

const StatusBadge = ({ status, meta }) => {
  const m = (meta || STATUS_META)[status] || { label: status, cls: 'badge-inactive' };
  return <span className={`status-badge ${m.cls}`}>{m.label}</span>;
};

const MaintenanceModal = ({ bed, onClose, onSave }) => {
  const [status, setStatus] = useState(bed.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'AVAILABLE');
  const [reason, setReason] = useState(bed.maintenanceReason || '');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === 'MAINTENANCE' && !reason.trim()) { setError('Please provide a reason for maintenance.'); return; }
    setSaving(true);
    try { await onSave({ status, maintenanceReason: reason.trim() || null }); }
    catch (err) { setError(err.response?.data?.message || 'Update failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Update {bed.bedNumber} Status</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-api-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Bed Status</label>
              <select className="form-input" value={status} onChange={e => { setStatus(e.target.value); setError(''); }}>
                <option value="AVAILABLE">Available</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>
            {status === 'MAINTENANCE' && (
              <div className="form-group">
                <label className="form-label">Maintenance Reason <span className="required">*</span></label>
                <textarea className="form-input form-textarea" value={reason}
                  onChange={e => { setReason(e.target.value); setError(''); }}
                  placeholder="Describe what needs fixing…" rows={3} maxLength={300} />
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Update'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Toast = ({ message, type, onClose }) => (
  <div className={`toast toast-${type}`}>
    <span>{message}</span>
    <button className="toast-close" onClick={onClose}>✕</button>
  </div>
);

const RoomDetailPage = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [room,           setRoom]           = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [maintenanceBed, setMaintenanceBed] = useState(null);
  const [toast,          setToast]          = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchRoom = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await roomsAPI.getRoomById(id);
      setRoom(res.data);
    } catch (err) {
      setError(err.response?.status === 404 ? 'Room not found.' : 'Failed to load room details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  const handleMaintenanceSave = async (data) => {
    await roomsAPI.updateBedMaintenance(room.id, maintenanceBed.id, data);
    showToast(`${maintenanceBed.bedNumber} updated to ${data.status}.`);
    setMaintenanceBed(null);
    fetchRoom();
  };

  if (loading) return (
    <div className="dashboard-layout">
      <Sidebar userType="warden" />
      <div className="dashboard-main">
        <Navbar title="Room Details" />
        <main className="dashboard-content">
          <div className="loading-state"><div className="loading-spinner large"></div><p>Loading room details…</p></div>
        </main>
      </div>
    </div>
  );

  if (error || !room) return (
    <div className="dashboard-layout">
      <Sidebar userType="warden" />
      <div className="dashboard-main">
        <Navbar title="Room Details" />
        <main className="dashboard-content">
          <button className="btn-back" onClick={() => navigate('/warden/rooms')}>← Back to Rooms</button>
          <div className="dashboard-error" style={{ marginTop: '1rem' }}>{error || 'Room not found.'}</div>
        </main>
      </div>
    </div>
  );

  return (
    <div className="dashboard-layout">
      <Sidebar userType="warden" />
      <div className="dashboard-main">
        <Navbar title={`Room ${room.roomNumber}`} />
        <main className="dashboard-content">
          <button className="btn-back" onClick={() => navigate('/warden/rooms')}>← Back to Rooms</button>

          {/* Room summary card */}
          <div className="detail-header-card">
            <div className="detail-header-top">
              <div>
                <h1 className="detail-room-title">Room {room.roomNumber}</h1>
                <p className="detail-room-subtitle">Floor {room.floor} · {room.roomType}{room.description ? ` · ${room.description}` : ''}</p>
              </div>
              <StatusBadge status={room.status} meta={STATUS_META} />
            </div>
            <div className="detail-summary-grid">
              <div className="detail-summary-item">
                <span className="detail-summary-label">Sharing Type</span>
                <span className="detail-summary-value">{room.sharingType} Sharing</span>
              </div>
              <div className="detail-summary-item">
                <span className="detail-summary-label">Capacity</span>
                <span className="detail-summary-value">{room.capacity} Beds</span>
              </div>
              <div className="detail-summary-item">
                <span className="detail-summary-label">Occupied</span>
                <span className="detail-summary-value occupied-val">{room.occupiedBeds}</span>
              </div>
              <div className="detail-summary-item">
                <span className="detail-summary-label">Available</span>
                <span className="detail-summary-value available-val">{room.availableBeds}</span>
              </div>
              <div className="detail-summary-item">
                <span className="detail-summary-label">Maintenance</span>
                <span className={`detail-summary-value ${room.maintenanceBeds > 0 ? 'maintenance-val' : ''}`}>{room.maintenanceBeds}</span>
              </div>
              <div className="detail-summary-item">
                <span className="detail-summary-label">Applicable Fee</span>
                <span className="detail-summary-value fee-highlight">
                  ₹{room.fee?.toLocaleString('en-IN')} <span className="fee-per">per student</span>
                </span>
              </div>
            </div>
          </div>

          {/* Beds & Students */}
          <div className="detail-section">
            <div className="detail-section-header">
              <h2 className="detail-section-title">Beds &amp; Students</h2>
              <span className="detail-section-subtitle">{room.occupiedBeds} of {room.capacity} beds occupied</span>
            </div>

            {/* Bed cards */}
            <div className="bed-cards-grid">
              {room.beds?.map(bed => (
                <div key={bed.id} className={`bed-card ${
                  bed.status === 'MAINTENANCE' ? 'bed-card-maintenance' :
                  bed.status === 'OCCUPIED'    ? 'bed-card-occupied'    : 'bed-card-available'
                }`}>
                  <div className="bed-card-header">
                    <span className="bed-number-label">{bed.bedNumber}</span>
                    <StatusBadge status={bed.status} meta={BED_STATUS_META} />
                  </div>

                  {bed.status === 'MAINTENANCE' ? (
                    <div className="bed-maintenance-info">
                      <div className="bed-maintenance-icon">🔧</div>
                      <p className="bed-maintenance-label">Under Maintenance</p>
                      {bed.maintenanceReason && <p className="bed-maintenance-reason">{bed.maintenanceReason}</p>}
                      {bed.maintenanceDate && (
                        <p className="bed-maintenance-date">
                          Since {new Date(bed.maintenanceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  ) : bed.status === 'OCCUPIED' && bed.student ? (
                    <div className="bed-student-info">
                      <div className="bed-student-avatar">{bed.student.name.charAt(0).toUpperCase()}</div>
                      <div className="bed-student-details">
                        <p className="bed-student-name">{bed.student.name}</p>
                        {bed.student.email  && <p className="bed-student-meta">{bed.student.email}</p>}
                        {bed.student.course && <p className="bed-student-meta">{bed.student.course}{bed.student.year ? ` · Year ${bed.student.year}` : ''}</p>}
                        <p className="bed-student-fee">Fee: <strong>₹{room.fee?.toLocaleString('en-IN')}</strong></p>
                      </div>
                    </div>
                  ) : (
                    <div className="bed-empty-info">
                      <p className="bed-empty-label">No student assigned</p>
                    </div>
                  )}

                  {bed.status !== 'OCCUPIED' && (
                    <button className="bed-maintenance-btn" onClick={() => setMaintenanceBed(bed)}>
                      {bed.status === 'MAINTENANCE' ? '✓ Mark Available' : '🔧 Set Maintenance'}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Summary table */}
            <div className="detail-table-section">
              <h3 className="detail-table-title">Summary Table</h3>
              <div className="table-wrapper">
                <table className="rooms-table">
                  <thead>
                    <tr>
                      <th>Bed</th><th>Student Name</th><th>Email</th>
                      <th>Course</th><th>Fee</th><th>Status</th><th>Maintenance Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {room.beds?.map(bed => (
                      <tr key={bed.id} className={bed.status === 'MAINTENANCE' ? 'row-maintenance' : ''}>
                        <td><strong>{bed.bedNumber}</strong></td>
                        <td>{bed.student?.name  || <span className="text-muted">—</span>}</td>
                        <td>{bed.student?.email || <span className="text-muted">—</span>}</td>
                        <td>{bed.student?.course
                          ? `${bed.student.course}${bed.student.year ? ` (Yr ${bed.student.year})` : ''}`
                          : <span className="text-muted">—</span>}
                        </td>
                        <td className="fee-cell">
                          {bed.status === 'OCCUPIED' ? `₹${room.fee?.toLocaleString('en-IN')}` : <span className="text-muted">—</span>}
                        </td>
                        <td><StatusBadge status={bed.status} meta={BED_STATUS_META} /></td>
                        <td>{bed.maintenanceReason
                          ? <span className="maintenance-reason-cell">{bed.maintenanceReason}</span>
                          : <span className="text-muted">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {maintenanceBed && <MaintenanceModal bed={maintenanceBed} onClose={() => setMaintenanceBed(null)} onSave={handleMaintenanceSave} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default RoomDetailPage;
