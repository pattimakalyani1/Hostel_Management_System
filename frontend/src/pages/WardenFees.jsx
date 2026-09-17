import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import DashboardCard from '../components/DashboardCard';
import { feeAPI } from '../services/api';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  statusBadgeClass,
  getErrorMessage
} from '../utils/feeHelpers';
import '../styles/dashboard.css';
import '../styles/fees.css';

const WardenFees = () => {
  const [tab, setTab] = useState('fees'); // 'fees' | 'payments'

  const [summary, setSummary] = useState(null);
  const [fees, setFees] = useState([]);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [formModal, setFormModal] = useState(null); // { mode: 'create'|'edit', fee }
  const [detailFee, setDetailFee] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [paymentDetailId, setPaymentDetailId] = useState(null);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const fetchData = async () => {
    try {
      setError('');
      const [summaryRes, feesRes, paymentsRes] = await Promise.all([
        feeAPI.getSummary(),
        feeAPI.getAllFees(),
        feeAPI.getAllPayments()
      ]);
      setSummary(summaryRes.data.summary);
      setFees(feesRes.data.fees || []);
      setPayments(paymentsRes.data.payments || []);
    } catch (err) {
      console.error('Warden fees fetch error:', err);
      setError(getErrorMessage(err, 'Failed to load fees data. Please refresh the page.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFormSuccess = (msg) => {
    setFormModal(null);
    showSuccess(msg);
    fetchData();
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    try {
      await feeAPI.deleteFee(deleteTarget.id);
      setDeleteTarget(null);
      showSuccess('Fee deleted successfully.');
      fetchData();
    } catch (err) {
      console.error('Delete fee error:', err);
      // Surface backend error (e.g. 409 when payments exist) clearly.
      setDeleteTarget(null);
      setError(getErrorMessage(err, 'Failed to delete the fee.'));
    }
  };

  const renderSummary = () => (
    <section className="dashboard-cards fees-summary">
      <DashboardCard title="Total Fee Amount" value={formatCurrency(summary?.totalFeeAmount || 0)} color="primary" subtitle={`${summary?.totalFees || 0} fees`} />
      <DashboardCard title="Total Collected" value={formatCurrency(summary?.totalPaidAmount || 0)} color="success" subtitle={`${summary?.totalPayments || 0} payments`} />
      <DashboardCard title="Total Outstanding" value={formatCurrency(summary?.totalOutstandingAmount || 0)} color={summary?.totalOutstandingAmount > 0 ? 'warning' : 'success'} subtitle="Amount due" />
      <DashboardCard title="Pending Fees" value={summary?.pendingFeesCount || 0} color="info" subtitle="Awaiting payment" />
      <DashboardCard title="Partial Fees" value={summary?.partialFeesCount || 0} color="info" subtitle="Partially paid" />
      <DashboardCard title="Paid Fees" value={summary?.paidFeesCount || 0} color="success" subtitle="Fully paid" />
      <DashboardCard title="Overdue Fees" value={summary?.overdueFeesCount || 0} color={summary?.overdueFeesCount > 0 ? 'warning' : 'success'} subtitle="Past due date" />
    </section>
  );

  const renderFeesTable = () => {
    if (fees.length === 0) {
      return (
        <div className="info-card">
          <div className="empty-state">
            <p>No fees found.</p>
            <span className="empty-hint">Fees are generated automatically when a student is allocated a room.</span>
          </div>
        </div>
      );
    }

    return (
      <div className="fees-table-wrap">
        <table className="fees-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Description</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Outstanding</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fees.map((fee) => (
              <tr key={fee.id}>
                <td>
                  <div className="fees-cell-primary">{fee.student?.name}</div>
                  <div className="fees-cell-sub">{fee.student?.email}</div>
                </td>
                <td>{fee.description || 'Hostel Fee'}</td>
                <td className="amount">{formatCurrency(fee.amount)}</td>
                <td>{formatCurrency(fee.paidAmount)}</td>
                <td>{formatCurrency(fee.outstandingAmount)}</td>
                <td>{formatDate(fee.dueDate)}</td>
                <td><span className={statusBadgeClass(fee.status)}>{fee.status}</span></td>
                <td>
                  <div className="fees-actions">
                    <button className="fees-btn fees-btn-secondary fees-btn-sm" onClick={() => setDetailFee(fee)}>View</button>
                    <button className="fees-btn fees-btn-secondary fees-btn-sm" onClick={() => setFormModal({ mode: 'edit', fee })}>Edit</button>
                    <button className="fees-btn fees-btn-danger fees-btn-sm" onClick={() => setDeleteTarget(fee)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderPaymentsTable = () => {
    if (payments.length === 0) {
      return (
        <div className="info-card">
          <div className="empty-state">
            <p>No payments found.</p>
            <span className="empty-hint">Student payments will appear here.</span>
          </div>
        </div>
      );
    }

    return (
      <div className="fees-table-wrap">
        <table className="fees-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Student</th>
              <th>Fee</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Transaction ID</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{formatDateTime(p.paymentDate)}</td>
                <td>
                  <div className="fees-cell-primary">{p.student?.name}</div>
                  <div className="fees-cell-sub">{p.student?.email}</div>
                </td>
                <td>
                  <div className="fees-cell-primary">{p.fee?.description || 'Hostel Fee'}</div>
                  <div className="fees-cell-sub">Fee #{p.fee?.id}</div>
                </td>
                <td className="amount">{formatCurrency(p.amount)}</td>
                <td>{p.paymentMethod}</td>
                <td>{p.transactionId || '--'}</td>
                <td><span className={statusBadgeClass(p.status)}>{p.status}</span></td>
                <td>
                  <button className="fees-btn fees-btn-secondary fees-btn-sm" onClick={() => setPaymentDetailId(p.id)}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <div className="loading-spinner large"></div>
          <p>Loading fees...</p>
        </div>
      );
    }

    return (
      <>
        {error && <div className="fees-alert fees-alert-error">{error}</div>}
        {successMsg && <div className="fees-alert fees-alert-success">{successMsg}</div>}

        {renderSummary()}

        <div className="fees-header">
          <div className="fees-actions">
            <button className={`fees-btn ${tab === 'fees' ? 'fees-btn-primary' : 'fees-btn-secondary'}`} onClick={() => setTab('fees')}>
              Fees
            </button>
            <button className={`fees-btn ${tab === 'payments' ? 'fees-btn-primary' : 'fees-btn-secondary'}`} onClick={() => setTab('payments')}>
              Payments
            </button>
          </div>
        </div>

        {tab === 'fees' ? renderFeesTable() : renderPaymentsTable()}
      </>
    );
  };

  return (
    <div className="dashboard-layout">
      <Sidebar userType="warden" />
      <div className="dashboard-main">
        <Navbar title="Fees Management" />
        <main className="dashboard-content">
          <div className="fees-header">
            <h2>Fees &amp; Payments</h2>
          </div>
          {renderContent()}
        </main>
      </div>

      {formModal && (
        <FeeFormModal
          mode={formModal.mode}
          fee={formModal.fee}
          onClose={() => setFormModal(null)}
          onSuccess={handleFormSuccess}
        />
      )}

      {detailFee && <FeeDetailsModal fee={detailFee} onClose={() => setDetailFee(null)} />}

      {deleteTarget && (
        <ConfirmDeleteModal
          fee={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirmed}
        />
      )}

      {paymentDetailId && (
        <PaymentDetailModal paymentId={paymentDetailId} onClose={() => setPaymentDetailId(null)} />
      )}
    </div>
  );
};

// Format a date value as YYYY-MM-DD using LOCAL date parts (no UTC conversion),
// so the date shown in the input matches the calendar date the warden saved.
const toDateInputValue = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ---- Add / Edit fee modal ----
const FeeFormModal = ({ mode, fee, onClose, onSuccess }) => {
  const isEdit = mode === 'edit';
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(!isEdit);

  const [studentId, setStudentId] = useState(fee?.student?.id ? String(fee.student.id) : '');
  const [amount, setAmount] = useState(fee?.amount != null ? String(fee.amount) : '');
  const [dueDate, setDueDate] = useState(toDateInputValue(fee?.dueDate));
  const [description, setDescription] = useState(fee?.description || '');

  const [fieldError, setFieldError] = useState('');
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const paidAmount = Number(fee?.paidAmount || 0);

  useEffect(() => {
    // Student dropdown is only needed for creating a new fee.
    if (isEdit) return;
    const loadStudents = async () => {
      try {
        const res = await feeAPI.getStudents();
        setStudents(res.data.students || []);
      } catch (err) {
        console.error('Load students error:', err);
        setApiError(getErrorMessage(err, 'Failed to load students.'));
      } finally {
        setStudentsLoading(false);
      }
    };
    loadStudents();
  }, [isEdit]);

  const validate = () => {
    if (!isEdit && !studentId) {
      return 'Please select a student.';
    }
    const value = parseFloat(amount);
    if (Number.isNaN(value) || value <= 0) {
      return 'Amount must be greater than 0.';
    }
    // On edit, do not allow reducing below already-paid amount.
    if (isEdit && value < paidAmount) {
      return `Amount cannot be less than the amount already paid (${formatCurrency(paidAmount)}).`;
    }
    if (!dueDate) {
      return 'Due date is required.';
    }
    if (Number.isNaN(new Date(dueDate).getTime())) {
      return 'Due date is invalid.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    const validationError = validate();
    if (validationError) {
      setFieldError(validationError);
      return;
    }
    setFieldError('');
    setSubmitting(true);
    try {
      if (isEdit) {
        // Status is never sent; backend derives it.
        await feeAPI.updateFee(fee.id, {
          amount: parseFloat(amount),
          dueDate,
          description: description.trim()
        });
        onSuccess('Fee updated successfully.');
      } else {
        await feeAPI.createFee({
          studentId: parseInt(studentId, 10),
          amount: parseFloat(amount),
          dueDate,
          description: description.trim()
        });
        onSuccess('Fee created successfully.');
      }
    } catch (err) {
      console.error('Save fee error:', err);
      setApiError(getErrorMessage(err, 'Failed to save the fee.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={submitting ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Fee' : 'Add Fee'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close" disabled={submitting}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {apiError && <div className="fees-alert fees-alert-error">{apiError}</div>}

            <div className="fees-form-group">
              <label htmlFor="fee-student">Student</label>
              {isEdit ? (
                <input id="fee-student" type="text" value={`${fee?.student?.name || ''} (${fee?.student?.email || ''})`} disabled />
              ) : (
                <select
                  id="fee-student"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  disabled={submitting || studentsLoading}
                  required
                >
                  <option value="">{studentsLoading ? 'Loading students...' : 'Select a student'}</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                  ))}
                </select>
              )}
            </div>

            <div className="fees-form-group">
              <label htmlFor="fee-amount">Amount</label>
              <input
                id="fee-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={submitting}
                required
              />
              {isEdit && paidAmount > 0 && (
                <span className="fees-cell-sub">Already paid: {formatCurrency(paidAmount)}</span>
              )}
            </div>

            <div className="fees-form-group">
              <label htmlFor="fee-due">Due Date</label>
              <input
                id="fee-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div className="fees-form-group">
              <label htmlFor="fee-desc">Description (optional)</label>
              <textarea
                id="fee-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
                placeholder="e.g. Hostel Fee - Semester 1"
              />
            </div>

            {fieldError && <span className="fees-field-error">{fieldError}</span>}
          </div>
          <div className="modal-footer">
            <button type="button" className="fees-btn fees-btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="fees-btn fees-btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Fee')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---- Fee details modal (Warden) ----
const FeeDetailsModal = ({ fee, onClose }) => {
  const payments = fee.payments || [];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Fee Details</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body">
          <div className="detail-grid">
            <div className="detail-item"><span className="label">Student</span><span className="value">{fee.student?.name}</span></div>
            <div className="detail-item"><span className="label">Email</span><span className="value">{fee.student?.email}</span></div>
            <div className="detail-item"><span className="label">Description</span><span className="value">{fee.description || 'Hostel Fee'}</span></div>
            <div className="detail-item"><span className="label">Status</span><span className="value"><span className={statusBadgeClass(fee.status)}>{fee.status}</span></span></div>
            <div className="detail-item"><span className="label">Total Amount</span><span className="value">{formatCurrency(fee.amount)}</span></div>
            <div className="detail-item"><span className="label">Paid</span><span className="value">{formatCurrency(fee.paidAmount)}</span></div>
            <div className="detail-item"><span className="label">Outstanding</span><span className="value">{formatCurrency(fee.outstandingAmount)}</span></div>
            <div className="detail-item"><span className="label">Due Date</span><span className="value">{formatDate(fee.dueDate)}</span></div>
          </div>

          <div className="detail-section-title">Payment History</div>
          {payments.length === 0 ? (
            <div className="empty-state"><p>No payments yet.</p></div>
          ) : (
            <div className="fees-table-wrap">
              <table className="fees-table">
                <thead>
                  <tr><th>Date</th><th>Amount</th><th>Method</th><th>Transaction ID</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{formatDateTime(p.paymentDate)}</td>
                      <td className="amount">{formatCurrency(p.amount)}</td>
                      <td>{p.paymentMethod}</td>
                      <td>{p.transactionId || '--'}</td>
                      <td><span className={statusBadgeClass(p.status)}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="fees-btn fees-btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ---- Delete confirmation modal ----
const ConfirmDeleteModal = ({ fee, onCancel, onConfirm }) => (
  <div className="modal-overlay" onClick={onCancel}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3>Delete Fee</h3>
        <button className="modal-close" onClick={onCancel} aria-label="Close">&times;</button>
      </div>
      <div className="modal-body">
        <p>
          Are you sure you want to delete the fee
          <strong> {fee.description || 'Hostel Fee'} </strong>
          for <strong>{fee.student?.name}</strong>?
        </p>
        <p className="fees-cell-sub">
          Fees that already have payments cannot be deleted, to preserve payment history.
        </p>
      </div>
      <div className="modal-footer">
        <button className="fees-btn fees-btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="fees-btn fees-btn-danger" onClick={onConfirm}>Delete</button>
      </div>
    </div>
  </div>
);

// ---- Payment detail modal (Warden) ----
const PaymentDetailModal = ({ paymentId, onClose }) => {
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await feeAPI.getPayment(paymentId);
        setPayment(res.data.payment);
      } catch (err) {
        console.error('Payment detail error:', err);
        setError(getErrorMessage(err, 'Failed to load payment details.'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [paymentId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Payment Details</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="loading-state"><div className="loading-spinner large"></div><p>Loading...</p></div>
          ) : error ? (
            <div className="fees-alert fees-alert-error">{error}</div>
          ) : payment ? (
            <div className="detail-grid">
              <div className="detail-item"><span className="label">Student</span><span className="value">{payment.student?.name}</span></div>
              <div className="detail-item"><span className="label">Email</span><span className="value">{payment.student?.email}</span></div>
              <div className="detail-item"><span className="label">Fee</span><span className="value">{payment.fee?.description || 'Hostel Fee'} (#{payment.fee?.id})</span></div>
              <div className="detail-item"><span className="label">Fee Status</span><span className="value"><span className={statusBadgeClass(payment.fee?.status)}>{payment.fee?.status}</span></span></div>
              <div className="detail-item"><span className="label">Amount</span><span className="value">{formatCurrency(payment.amount)}</span></div>
              <div className="detail-item"><span className="label">Method</span><span className="value">{payment.paymentMethod}</span></div>
              <div className="detail-item"><span className="label">Transaction ID</span><span className="value">{payment.transactionId || '--'}</span></div>
              <div className="detail-item"><span className="label">Payment Status</span><span className="value"><span className={statusBadgeClass(payment.status)}>{payment.status}</span></span></div>
              <div className="detail-item"><span className="label">Date</span><span className="value">{formatDateTime(payment.paymentDate)}</span></div>
            </div>
          ) : null}
        </div>
        <div className="modal-footer">
          <button className="fees-btn fees-btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default WardenFees;
