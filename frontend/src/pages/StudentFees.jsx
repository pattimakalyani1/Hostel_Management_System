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
  getErrorMessage,
  STUDENT_PAYMENT_METHODS
} from '../utils/feeHelpers';
import '../styles/dashboard.css';
import '../styles/fees.css';

const StudentFees = () => {
  const [fees, setFees] = useState([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal state
  const [detailFee, setDetailFee] = useState(null);
  const [payFee, setPayFee] = useState(null);

  const fetchFees = async () => {
    try {
      setError('');
      const response = await feeAPI.getMyFees();
      setFees(response.data.fees || []);
      setTotalOutstanding(response.data.totalOutstanding || 0);
    } catch (err) {
      console.error('My fees fetch error:', err);
      setError(getErrorMessage(err, 'Failed to load your fees. Please refresh the page.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  const totalFees = fees.reduce((sum, f) => sum + Number(f.amount || 0), 0);
  const totalPaid = fees.reduce((sum, f) => sum + Number(f.paidAmount || 0), 0);

  const handlePaymentSuccess = (message) => {
    setPayFee(null);
    setSuccessMsg(message || 'Payment successful.');
    fetchFees();
    // Auto-clear the success message after a few seconds
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <div className="loading-spinner large"></div>
          <p>Loading your fees...</p>
        </div>
      );
    }

    return (
      <>
        {error && <div className="fees-alert fees-alert-error">{error}</div>}
        {successMsg && <div className="fees-alert fees-alert-success">{successMsg}</div>}

        <section className="dashboard-cards fees-summary">
          <DashboardCard title="Total Fees" value={formatCurrency(totalFees)} color="primary" subtitle={`${fees.length} fee(s)`} />
          <DashboardCard title="Total Paid" value={formatCurrency(totalPaid)} color="success" subtitle="Successful payments" />
          <DashboardCard
            title="Total Outstanding"
            value={formatCurrency(totalOutstanding)}
            color={totalOutstanding > 0 ? 'warning' : 'success'}
            subtitle={totalOutstanding > 0 ? 'Amount due' : 'All clear'}
          />
        </section>

        {fees.length === 0 ? (
          <div className="info-card">
            <div className="empty-state">
              <p>No fees found.</p>
              <span className="empty-hint">You currently have no fees assigned.</span>
            </div>
          </div>
        ) : (
          <div className="fee-card-grid">
            {fees.map((fee) => (
              <div className="fee-card" key={fee.id}>
                <div className="fee-card-head">
                  <span className="fee-card-title">{fee.description || 'Hostel Fee'}</span>
                  <span className={statusBadgeClass(fee.status)}>{fee.status}</span>
                </div>
                <div className="fee-card-rows">
                  <div className="fee-card-row">
                    <span className="label">Total</span>
                    <span className="value">{formatCurrency(fee.amount)}</span>
                  </div>
                  <div className="fee-card-row">
                    <span className="label">Paid</span>
                    <span className="value paid">{formatCurrency(fee.paidAmount)}</span>
                  </div>
                  <div className="fee-card-row">
                    <span className="label">Outstanding</span>
                    <span className="value outstanding">{formatCurrency(fee.outstandingAmount)}</span>
                  </div>
                  <div className="fee-card-row">
                    <span className="label">Due Date</span>
                    <span className="value">{formatDate(fee.dueDate)}</span>
                  </div>
                </div>
                <div className="fee-card-actions">
                  <button className="fees-btn fees-btn-secondary fees-btn-sm" onClick={() => setDetailFee(fee)}>
                    View Details
                  </button>
                  {fee.outstandingAmount > 0 ? (
                    <button className="fees-btn fees-btn-primary fees-btn-sm" onClick={() => setPayFee(fee)}>
                      Pay Now
                    </button>
                  ) : (
                    <span className={statusBadgeClass('PAID')}>PAID</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="dashboard-layout">
      <Sidebar userType="student" />
      <div className="dashboard-main">
        <Navbar title="My Fees" />
        <main className="dashboard-content">
          <div className="fees-header">
            <h2>My Fees</h2>
          </div>
          {renderContent()}
        </main>
      </div>

      {detailFee && (
        <FeeDetailsModal fee={detailFee} onClose={() => setDetailFee(null)} />
      )}

      {payFee && (
        <PaymentModal
          fee={payFee}
          onClose={() => setPayFee(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

// ---- Fee details (with payment history) modal ----
const FeeDetailsModal = ({ fee, onClose }) => {
  const payments = fee.payments || [];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{fee.description || 'Hostel Fee'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body">
          <div className="detail-grid">
            <div className="detail-item">
              <span className="label">Total Amount</span>
              <span className="value">{formatCurrency(fee.amount)}</span>
            </div>
            <div className="detail-item">
              <span className="label">Status</span>
              <span className="value"><span className={statusBadgeClass(fee.status)}>{fee.status}</span></span>
            </div>
            <div className="detail-item">
              <span className="label">Paid</span>
              <span className="value">{formatCurrency(fee.paidAmount)}</span>
            </div>
            <div className="detail-item">
              <span className="label">Outstanding</span>
              <span className="value">{formatCurrency(fee.outstandingAmount)}</span>
            </div>
            <div className="detail-item">
              <span className="label">Due Date</span>
              <span className="value">{formatDate(fee.dueDate)}</span>
            </div>
          </div>

          <div className="detail-section-title">Payment History</div>
          {payments.length === 0 ? (
            <div className="empty-state">
              <p>No payments yet.</p>
            </div>
          ) : (
            <div className="fees-table-wrap">
              <table className="fees-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Transaction ID</th>
                    <th>Status</th>
                  </tr>
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

// ---- Payment modal (Pay Now) ----
const PaymentModal = ({ fee, onClose, onSuccess }) => {
  const [amount, setAmount] = useState(String(fee.outstandingAmount));
  const [paymentMethod, setPaymentMethod] = useState(STUDENT_PAYMENT_METHODS[0]);
  const [transactionId, setTransactionId] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const outstanding = Number(fee.outstandingAmount);

  const validate = () => {
    const value = parseFloat(amount);
    if (Number.isNaN(value) || value <= 0) {
      return 'Amount must be greater than 0.';
    }
    if (value > outstanding) {
      return `Amount cannot exceed the outstanding balance of ${formatCurrency(outstanding)}.`;
    }
    if (!STUDENT_PAYMENT_METHODS.includes(paymentMethod)) {
      return 'Please select a valid payment method.';
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
      // studentId is never sent; the backend derives the student from the token.
      const payload = {
        amount: parseFloat(amount),
        paymentMethod
      };
      if (transactionId.trim()) {
        payload.transactionId = transactionId.trim();
      }
      const response = await feeAPI.makePayment(fee.id, payload);
      onSuccess(response.data?.message || 'Payment successful.');
    } catch (err) {
      console.error('Payment error:', err);
      setApiError(getErrorMessage(err, 'Payment failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={submitting ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Pay Fee - {fee.description || 'Hostel Fee'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close" disabled={submitting}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {apiError && <div className="fees-alert fees-alert-error">{apiError}</div>}

            <div className="detail-grid">
              <div className="detail-item">
                <span className="label">Total</span>
                <span className="value">{formatCurrency(fee.amount)}</span>
              </div>
              <div className="detail-item">
                <span className="label">Outstanding</span>
                <span className="value">{formatCurrency(outstanding)}</span>
              </div>
            </div>

            <div className="fees-form-group">
              <label htmlFor="pay-amount">Amount (max {formatCurrency(outstanding)})</label>
              <input
                id="pay-amount"
                type="number"
                min="0.01"
                step="0.01"
                max={outstanding}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div className="fees-form-group">
              <label htmlFor="pay-method">Payment Method</label>
              <select
                id="pay-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={submitting}
              >
                {STUDENT_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="fees-form-group">
              <label htmlFor="pay-txn">Transaction ID (optional)</label>
              <input
                id="pay-txn"
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                disabled={submitting}
                placeholder="e.g. TXN123456"
              />
            </div>

            {fieldError && <span className="fees-field-error">{fieldError}</span>}
          </div>
          <div className="modal-footer">
            <button type="button" className="fees-btn fees-btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="fees-btn fees-btn-primary" disabled={submitting}>
              {submitting ? 'Processing...' : 'Pay Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentFees;
