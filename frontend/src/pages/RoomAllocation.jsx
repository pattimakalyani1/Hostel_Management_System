import { useState, useEffect, useCallback } from 'react';
import { roomAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import DashboardCard from '../components/DashboardCard';
import '../styles/dashboard.css';
import '../styles/allocation.css';

const bedStatusBadge = (status) => {
  const map = {
    AVAILABLE: 'badge-available',
    OCCUPIED: 'badge-occupied',
    MAINTENANCE: 'badge-maintenance'
  };
  return `badge ${map[status] || 'badge-vacated'}`;
};

const formatDate = (value) => {
  if (!value) return '--';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const RoomAllocation = () => {
  const [rooms, setRooms] = useState([]);
  const [summary, setSummary] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('ALL');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null); // { type, message }

  // Allocation dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedBedId, setSelectedBedId] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState('');

  const showToast = (type, message) => {
    setToast({ type, message });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 5000);
  };

  const fetchRooms = useCallback(async () => {
    const response = await roomAPI.getRooms();
    setRooms(response.data.rooms);
    setSummary(response.data.summary);
  }, []);

  const fetchAllocations = useCallback(async (filter) => {
    const status = filter && filter !== 'ALL' ? filter : undefined;
    const response = await roomAPI.getAllocations(status);
    setAllocations(response.data.allocations);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchRooms(), fetchAllocations(historyFilter)]);
      setError('');
    } catch (err) {
      console.error('Room allocation load error:', err);
      setError('Failed to load room allocation data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [fetchRooms, fetchAllocations, historyFilter]);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHistoryFilter = async (filter) => {
    setHistoryFilter(filter);
    try {
      await fetchAllocations(filter);
    } catch (err) {
      console.error('History filter error:', err);
    }
  };

  // ---- Allocation dialog ----
  const openDialog = () => {
    setShowDialog(true);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedStudent(null);
    setSelectedRoomId('');
    setSelectedBedId('');
    setShowConfirm(false);
    setDialogError('');
  };

  const closeDialog = () => {
    setShowDialog(false);
    setShowConfirm(false);
  };

  // Debounced student search
  useEffect(() => {
    if (!showDialog) return;
    const handle = window.setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        setSearching(true);
        const response = await roomAPI.searchStudents(searchQuery.trim());
        setSearchResults(response.data.students);
      } catch (err) {
        console.error('Student search error:', err);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => window.clearTimeout(handle);
  }, [searchQuery, showDialog]);

  const selectedRoom = rooms.find((r) => r.id === Number(selectedRoomId)) || null;
  const bedsForRoom = selectedRoom ? selectedRoom.beds : [];
  const selectedBed = bedsForRoom.find((b) => b.id === Number(selectedBedId)) || null;

  const canAllocate =
    selectedStudent && selectedRoomId && selectedBedId && selectedBed?.status === 'AVAILABLE';

  const handleConfirmAllocation = async () => {
    if (!canAllocate) return;
    try {
      setSubmitting(true);
      setDialogError('');
      const response = await roomAPI.allocateBed({
        studentId: selectedStudent.id,
        roomId: Number(selectedRoomId),
        bedId: Number(selectedBedId)
      });
      closeDialog();
      showToast('success', response.data.message);
      // Refresh room/bed availability and allocation history
      await Promise.all([fetchRooms(), fetchAllocations(historyFilter)]);
    } catch (err) {
      console.error('Allocate error:', err);
      setDialogError(err.response?.data?.message || 'Failed to allocate bed. Please try again.');
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVacate = async (allocation) => {
    const confirmed = window.confirm(
      `Vacate Room ${allocation.roomNumber} (Bed ${allocation.bedNumber}) for ${allocation.studentName}?`
    );
    if (!confirmed) return;
    try {
      const response = await roomAPI.vacateAllocation(allocation.id);
      showToast('success', response.data.message);
      await Promise.all([fetchRooms(), fetchAllocations(historyFilter)]);
    } catch (err) {
      console.error('Vacate error:', err);
      showToast('error', err.response?.data?.message || 'Failed to vacate allocation.');
    }
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar userType="warden" />
        <div className="dashboard-main">
          <Navbar title="Room Allocation" />
          <main className="dashboard-content">
            <div className="loading-state">
              <div className="loading-spinner large"></div>
              <p>Loading room allocation...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar userType="warden" />
      <div className="dashboard-main">
        <Navbar title="Room Allocation" />
        <main className="dashboard-content">
          <div className="dashboard-header">
            <div className="welcome-section">
              <h1>Room Allocation</h1>
              <p className="welcome-subtitle">Allocate beds to students and manage occupancy</p>
            </div>
          </div>

          {error && <div className="dashboard-error">{error}</div>}

          {toast && (
            <div className={`toast toast-${toast.type}`}>{toast.message}</div>
          )}

          {/* Summary cards */}
          <section className="dashboard-cards warden-cards">
            <DashboardCard title="Total Rooms" value={summary?.totalRooms || 0} color="primary" subtitle="Hostel rooms" />
            <DashboardCard title="Total Beds" value={summary?.totalBeds || 0} color="info" subtitle="All beds" />
            <DashboardCard title="Available Beds" value={summary?.availableBeds || 0} color="success" subtitle="Ready to allocate" />
            <DashboardCard title="Occupied Beds" value={summary?.occupiedBeds || 0} color="info" subtitle="Currently in use" />
            <DashboardCard title="Maintenance Beds" value={summary?.maintenanceBeds || 0} color="warning" subtitle="Out of service" />
          </section>

          {/* Rooms & bed availability */}
          <section className="allocation-section">
            <div className="allocation-section-header">
              <h2>Rooms &amp; Bed Availability</h2>
              <button className="btn btn-primary" onClick={openDialog}>+ Allocate Bed</button>
            </div>

            {rooms.length === 0 ? (
              <div className="info-card">
                <div className="empty-state">
                  <p>No rooms found</p>
                  <span className="empty-hint">Add rooms to begin allocating beds</span>
                </div>
              </div>
            ) : (
              <div className="rooms-grid">
                {rooms.map((room) => (
                  <div className="room-card" key={room.id}>
                    <div className="room-card-header">
                      <div>
                        <h3>Room {room.roomNumber}</h3>
                        <div className="room-card-meta">
                          Floor {room.floor} · Capacity {room.capacity}
                          {room.roomType ? ` · ${room.roomType}` : ''}
                        </div>
                      </div>
                      <div className="room-card-availability">
                        <strong>{room.availableBeds}</strong>
                        available
                      </div>
                    </div>
                    <div className="bed-list">
                      {room.beds.map((bed) => (
                        <div className="bed-row" key={bed.id}>
                          <div className="bed-row-info">
                            <span className="bed-number">Bed {bed.bedNumber}</span>
                            {bed.occupant && (
                              <span className="bed-occupant">{bed.occupant.studentName}</span>
                            )}
                          </div>
                          <span className={bedStatusBadge(bed.status)}>{bed.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Allocation history */}
          <section className="allocation-section">
            <div className="allocation-section-header">
              <h2>Allocation History</h2>
              <div className="filter-group">
                {['ALL', 'ACTIVE', 'VACATED'].map((f) => (
                  <button
                    key={f}
                    className={`filter-pill ${historyFilter === f ? 'active' : ''}`}
                    onClick={() => handleHistoryFilter(f)}
                  >
                    {f.charAt(0) + f.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {allocations.length === 0 ? (
              <div className="info-card">
                <div className="empty-state">
                  <p>No allocations found</p>
                  <span className="empty-hint">Allocated beds will appear here</span>
                </div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Room</th>
                      <th>Bed</th>
                      <th>Allocated</th>
                      <th>Vacated</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map((a) => (
                      <tr key={a.id}>
                        <td>{a.studentName}</td>
                        <td>{a.roomNumber} <span style={{ color: 'var(--gray-400)' }}>(Fl {a.floor})</span></td>
                        <td>{a.bedNumber}</td>
                        <td>{formatDate(a.allocatedDate)}</td>
                        <td>{formatDate(a.vacatedDate)}</td>
                        <td>
                          <span className={`badge ${a.status === 'ACTIVE' ? 'badge-active' : 'badge-vacated'}`}>
                            {a.status}
                          </span>
                        </td>
                        <td>
                          {a.status === 'ACTIVE' && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleVacate(a)}>
                              Vacate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Allocation dialog */}
      {showDialog && (
        <div className="modal-overlay" onClick={closeDialog}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {!showConfirm ? (
              <>
                <div className="modal-header">
                  <h3>Allocate Bed</h3>
                  <button className="modal-close" onClick={closeDialog} aria-label="Close">×</button>
                </div>
                <div className="modal-body">
                  {/* Step 1: student search */}
                  <div className="form-group">
                    <label>Student</label>
                    {selectedStudent ? (
                      <div className="student-result">
                        <div className="student-result-info">
                          <span className="student-result-name">{selectedStudent.name}</span>
                          <span className="student-result-meta">
                            #{selectedStudent.id} · {selectedStudent.email}
                          </span>
                        </div>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => { setSelectedStudent(null); setSearchQuery(''); }}
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="search-box">
                        <input
                          type="text"
                          placeholder="Search by name, ID or email"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          autoFocus
                        />
                      </div>
                    )}
                  </div>

                  {!selectedStudent && (
                    <div className="search-results">
                      {searching && <span className="student-result-meta">Searching…</span>}
                      {!searching && searchQuery.trim() && searchResults.length === 0 && (
                        <span className="student-result-meta">No students found.</span>
                      )}
                      {searchResults.map((s) => (
                        <div className="student-result" key={s.id}>
                          <div className="student-result-info">
                            <span className="student-result-name">{s.name}</span>
                            <span className="student-result-meta">
                              #{s.id} · {s.email}
                              {s.hasActiveAllocation && s.currentAllocation
                                ? ` · Room ${s.currentAllocation.roomNumber}/${s.currentAllocation.bedNumber}`
                                : ''}
                            </span>
                          </div>
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={s.hasActiveAllocation}
                            title={s.hasActiveAllocation ? 'Student already has an active allocation' : ''}
                            onClick={() => { setSelectedStudent(s); setSearchResults([]); }}
                          >
                            {s.hasActiveAllocation ? 'Allocated' : 'Select'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Step 2: room */}
                  <div className="form-group">
                    <label>Room</label>
                    <select
                      value={selectedRoomId}
                      onChange={(e) => { setSelectedRoomId(e.target.value); setSelectedBedId(''); }}
                    >
                      <option value="">Select a room</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          Room {room.roomNumber} — Floor {room.floor} ({room.availableBeds} available)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Step 3: bed (only beds of selected room; only AVAILABLE selectable) */}
                  <div className="form-group">
                    <label>Bed</label>
                    <select
                      value={selectedBedId}
                      onChange={(e) => setSelectedBedId(e.target.value)}
                      disabled={!selectedRoomId}
                    >
                      <option value="">
                        {selectedRoomId ? 'Select a bed' : 'Select a room first'}
                      </option>
                      {bedsForRoom.map((bed) => (
                        <option key={bed.id} value={bed.id} disabled={bed.status !== 'AVAILABLE'}>
                          Bed {bed.bedNumber} — {bed.status}
                        </option>
                      ))}
                    </select>
                  </div>

                  {dialogError && <div className="form-error">{dialogError}</div>}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
                  <button
                    className="btn btn-primary"
                    disabled={!canAllocate}
                    onClick={() => { setDialogError(''); setShowConfirm(true); }}
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="modal-header">
                  <h3>Allocate Bed?</h3>
                  <button className="modal-close" onClick={closeDialog} aria-label="Close">×</button>
                </div>
                <div className="modal-body">
                  <p className="confirm-text">Please confirm the following allocation:</p>
                  <div className="confirm-summary">
                    <div className="confirm-row">
                      <span className="label">Student</span>
                      <span className="value">{selectedStudent?.name}</span>
                    </div>
                    <div className="confirm-row">
                      <span className="label">Room</span>
                      <span className="value">{selectedRoom?.roomNumber}</span>
                    </div>
                    <div className="confirm-row">
                      <span className="label">Bed</span>
                      <span className="value">{selectedBed?.bedNumber}</span>
                    </div>
                  </div>
                  {dialogError && <div className="form-error">{dialogError}</div>}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowConfirm(false)} disabled={submitting}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={handleConfirmAllocation} disabled={submitting}>
                    {submitting ? 'Allocating…' : 'Confirm Allocation'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomAllocation;
