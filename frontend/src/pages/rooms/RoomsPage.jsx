import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import DashboardCard from '../../components/DashboardCard';
import AddEditRoomModal from './AddEditRoomModal';
import { roomsAPI } from '../../services/roomsApi';
import './rooms.css';

const STATUS_META = {
  AVAILABLE:          { label: 'Available',          cls: 'badge-success'     },
  PARTIALLY_OCCUPIED: { label: 'Partially Occupied', cls: 'badge-warning'     },
  FULL:               { label: 'Full',               cls: 'badge-error'       },
  MAINTENANCE:        { label: 'Maintenance',        cls: 'badge-maintenance' },
  INACTIVE:           { label: 'Inactive',           cls: 'badge-inactive'    },
};

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || { label: status, cls: 'badge-inactive' };
  return <span className={`status-badge ${meta.cls}`}>{meta.label}</span>;
};

const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div className="modal-backdrop" onClick={onCancel}>
    <div className="confirm-box" onClick={e => e.stopPropagation()}>
      <p className="confirm-message">{message}</p>
      <div className="confirm-actions">
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-danger"    onClick={onConfirm}>Delete</button>
      </div>
    </div>
  </div>
);

const Toast = ({ message, type, onClose }) => (
  <div className={`toast toast-${type}`}>
    <span>{message}</span>
    <button className="toast-close" onClick={onClose}>✕</button>
  </div>
);

const RoomsPage = () => {
  const navigate = useNavigate();

  const [rooms,   setRooms]   = useState([]);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const [search,       setSearch]       = useState('');
  const [filterFloor,  setFilterFloor]  = useState('');
  const [filterShare,  setFilterShare]  = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showAddEdit,  setShowAddEdit]  = useState(false);
  const [editingRoom,  setEditingRoom]  = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast,        setToast]        = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchRooms = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = {};
      if (search)       params.search      = search;
      if (filterFloor)  params.floor       = filterFloor;
      if (filterShare)  params.sharingType = filterShare;
      if (filterStatus) params.status      = filterStatus;
      const res = await roomsAPI.getRooms(params);
      setRooms(res.data.rooms);
      setStats(res.data.stats);
    } catch (err) {
      setError('Failed to load rooms. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, filterFloor, filterShare, filterStatus]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const handleSave = async (formData) => {
    if (editingRoom) {
      await roomsAPI.updateRoom(editingRoom.id, formData);
      showToast(`Room "${editingRoom.roomNumber}" updated successfully.`);
    } else {
      await roomsAPI.createRoom(formData);
      showToast(`Room "${formData.roomNumber}" created successfully.`);
    }
    setShowAddEdit(false);
    fetchRooms();
  };

  const handleDeleteConfirm = async () => {
    try {
      await roomsAPI.deleteRoom(deleteTarget.id);
      showToast(`Room "${deleteTarget.roomNumber}" deleted successfully.`);
      setDeleteTarget(null);
      fetchRooms();
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed.', 'error');
      setDeleteTarget(null);
    }
  };

  const floorOptions = [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b);
  const hasFilters   = search || filterFloor || filterShare || filterStatus;

  return (
    <div className="dashboard-layout">
      <Sidebar userType="warden" />
      <div className="dashboard-main">
        <Navbar title="Room Management" />
        <main className="dashboard-content">
          <div className="page-header">
            <div>
              <h1 className="page-title">Rooms</h1>
              <p className="page-subtitle">Manage all hostel rooms and bed details</p>
            </div>
            <button className="btn btn-primary" onClick={() => { setEditingRoom(null); setShowAddEdit(true); }}>
              + Add Room
            </button>
          </div>

          {error && <div className="dashboard-error">{error}</div>}

          {stats && (
            <>
              <section className="dashboard-cards rooms-stats-cards">
                <DashboardCard title="Total Rooms"        value={stats.totalRooms}        color="primary" subtitle="All rooms" />
                <DashboardCard title="Available Rooms"    value={stats.availableRooms}    color="success" subtitle="Ready for allocation" />
                <DashboardCard title="Partially Occupied" value={stats.partiallyOccupied} color="warning" subtitle="Some beds filled" />
                <DashboardCard title="Full Rooms"         value={stats.fullRooms}         color="info"    subtitle="All beds occupied" />
                <DashboardCard title="Maintenance"        value={stats.maintenanceRooms}  color={stats.maintenanceRooms > 0 ? 'warning' : 'success'} subtitle="Under maintenance" />
              </section>
              <section className="dashboard-cards bed-stats-cards">
                <DashboardCard title="Total Beds"       value={stats.totalBeds}       color="primary" subtitle="Across all rooms" />
                <DashboardCard title="Occupied Beds"    value={stats.occupiedBeds}    color="info"    subtitle="Currently in use" />
                <DashboardCard title="Available Beds"   value={stats.availableBeds}   color="success" subtitle="Free to allocate" />
                <DashboardCard title="Maintenance Beds" value={stats.maintenanceBeds} color={stats.maintenanceBeds > 0 ? 'warning' : 'success'} subtitle="Under maintenance" />
              </section>
            </>
          )}

          <div className="filter-bar">
            <div className="filter-search-wrap">
              <input type="text" className="form-input filter-search" placeholder="Search room number…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-input filter-select" value={filterFloor} onChange={e => setFilterFloor(e.target.value)}>
              <option value="">All Floors</option>
              {floorOptions.map(f => <option key={f} value={f}>Floor {f}</option>)}
            </select>
            <select className="form-input filter-select" value={filterShare} onChange={e => setFilterShare(e.target.value)}>
              <option value="">All Sharing Types</option>
              {[1,2,3,4].map(s => <option key={s} value={s}>{s} Sharing</option>)}
            </select>
            <select className="form-input filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="PARTIALLY_OCCUPIED">Partially Occupied</option>
              <option value="FULL">Full</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
            {hasFilters && (
              <button className="btn btn-secondary btn-sm"
                onClick={() => { setSearch(''); setFilterFloor(''); setFilterShare(''); setFilterStatus(''); }}>
                Clear Filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="loading-state"><div className="loading-spinner large"></div><p>Loading rooms…</p></div>
          ) : rooms.length === 0 ? (
            <div className="empty-state">
              <p>{hasFilters ? 'No rooms match your filters.' : 'No rooms added yet.'}</p>
              {!hasFilters && <button className="btn btn-primary" style={{ marginTop: '1rem' }}
                onClick={() => { setEditingRoom(null); setShowAddEdit(true); }}>Add First Room</button>}
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="rooms-table">
                <thead>
                  <tr>
                    <th>Room No.</th><th>Floor</th><th>Sharing</th><th>Capacity</th>
                    <th>Occupied</th><th>Available</th><th>Maintenance</th>
                    <th>Room Fee</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map(room => (
                    <tr key={room.id} className="table-row-clickable" onClick={() => navigate(`/warden/rooms/${room.id}`)}>
                      <td><span className="room-number-badge">{room.roomNumber}</span></td>
                      <td>Floor {room.floor}</td>
                      <td>{room.sharingType} Sharing</td>
                      <td>{room.capacity}</td>
                      <td><span className={room.occupiedBeds > 0 ? 'count-occupied' : 'count-zero'}>{room.occupiedBeds}</span></td>
                      <td><span className={room.availableBeds > 0 ? 'count-available' : 'count-zero'}>{room.availableBeds}</span></td>
                      <td>{room.maintenanceBeds > 0
                        ? <span className="count-maintenance">{room.maintenanceBeds}</span>
                        : <span className="count-zero">0</span>}</td>
                      <td className="fee-cell">₹{room.fee.toLocaleString('en-IN')}</td>
                      <td><StatusBadge status={room.status} /></td>
                      <td className="actions-cell" onClick={e => e.stopPropagation()}>
                        <button className="btn-action btn-view" onClick={() => navigate(`/warden/rooms/${room.id}`)}>View</button>
                        <button className="btn-action btn-edit" onClick={(e) => { e.stopPropagation(); setEditingRoom(room); setShowAddEdit(true); }}>Edit</button>
                        <button className="btn-action btn-delete" onClick={(e) => { e.stopPropagation(); setDeleteTarget(room); }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {showAddEdit && <AddEditRoomModal room={editingRoom} onClose={() => setShowAddEdit(false)} onSave={handleSave} />}
      {deleteTarget && <ConfirmDialog message={`Delete room "${deleteTarget.roomNumber}"? This cannot be undone.`}
        onConfirm={handleDeleteConfirm} onCancel={() => setDeleteTarget(null)} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default RoomsPage;
