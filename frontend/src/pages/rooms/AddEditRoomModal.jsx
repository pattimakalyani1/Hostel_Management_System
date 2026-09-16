import { useState, useEffect } from 'react';
import './rooms.css';

const SHARING_OPTIONS = [1, 2, 3, 4];
const BASE_4_FEE = 5000;
const calcFee = (sharing) => BASE_4_FEE + (4 - sharing) * 500;

const AddEditRoomModal = ({ room, onClose, onSave }) => {
  const isEdit = !!room;

  const [form, setForm] = useState({
    roomNumber:  room?.roomNumber  || '',
    floor:       room?.floor !== undefined ? String(room.floor) : '',
    sharingType: room?.sharingType || 4,
    description: room?.description || '',
  });
  const [errors,   setErrors]   = useState({});
  const [saving,   setSaving]   = useState(false);
  const [apiError, setApiError] = useState('');

  const fee      = calcFee(Number(form.sharingType));
  const capacity = Number(form.sharingType);

  useEffect(() => {
    if (room) {
      setForm({
        roomNumber:  room.roomNumber,
        floor:       String(room.floor),
        sharingType: room.sharingType,
        description: room.description || '',
      });
    }
  }, [room]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!form.roomNumber.trim()) errs.roomNumber = 'Room number is required.';
    if (form.floor === '') errs.floor = 'Floor is required.';
    else if (isNaN(Number(form.floor)) || Number(form.floor) < 0) errs.floor = 'Floor must be 0 or greater.';
    if (!form.sharingType) errs.sharingType = 'Sharing type is required.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    setApiError('');
    try {
      await onSave({
        roomNumber:  form.roomNumber.trim(),
        floor:       Number(form.floor),
        sharingType: Number(form.sharingType),
        description: form.description.trim() || null,
      });
    } catch (err) {
      setApiError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Room' : 'Add New Room'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {apiError && <div className="form-api-error">{apiError}</div>}

            <div className="form-group">
              <label className="form-label">Room Number <span className="required">*</span></label>
              <input name="roomNumber" type="text" className={`form-input ${errors.roomNumber ? 'input-error' : ''}`}
                value={form.roomNumber} onChange={handleChange} disabled={isEdit} placeholder="e.g. 101" maxLength={20} />
              {isEdit && <span className="form-hint">Room number cannot be changed after creation.</span>}
              {errors.roomNumber && <span className="form-error">{errors.roomNumber}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Floor <span className="required">*</span></label>
              <input name="floor" type="number" min="0" className={`form-input ${errors.floor ? 'input-error' : ''}`}
                value={form.floor} onChange={handleChange} placeholder="e.g. 0, 1, 2" />
              {errors.floor && <span className="form-error">{errors.floor}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Sharing Type <span className="required">*</span></label>
              <select name="sharingType" className={`form-input ${errors.sharingType ? 'input-error' : ''}`}
                value={form.sharingType} onChange={handleChange}>
                {SHARING_OPTIONS.map(s => <option key={s} value={s}>{s} Sharing</option>)}
              </select>
              {errors.sharingType && <span className="form-error">{errors.sharingType}</span>}
            </div>

            <div className="form-preview-row">
              <div className="form-preview-item">
                <span className="form-preview-label">Capacity</span>
                <span className="form-preview-value">{capacity} Beds</span>
              </div>
              <div className="form-preview-item">
                <span className="form-preview-label">Applicable Fee</span>
                <span className="form-preview-value fee-amount">₹{fee.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea name="description" className="form-input form-textarea"
                value={form.description} onChange={handleChange}
                placeholder="Any notes about this room..." rows={3} maxLength={500} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditRoomModal;
