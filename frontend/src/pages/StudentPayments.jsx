import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { feeAPI } from '../services/api';
import {
  formatCurrency,
  formatDateTime,
  statusBadgeClass,
  getErrorMessage
} from '../utils/feeHelpers';
import '../styles/dashboard.css';
import '../styles/fees.css';

const StudentPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setError('');
        const response = await feeAPI.getMyPayments();
        setPayments(response.data.payments || []);
      } catch (err) {
        console.error('Payment history fetch error:', err);
        setError(getErrorMessage(err, 'Failed to load your payment history. Please refresh the page.'));
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <div className="loading-spinner large"></div>
          <p>Loading payment history...</p>
        </div>
      );
    }

    if (error) {
      return <div className="fees-alert fees-alert-error">{error}</div>;
    }

    if (payments.length === 0) {
      return (
        <div className="info-card">
          <div className="empty-state">
            <p>No payments found.</p>
            <span className="empty-hint">Your successful payments will appear here.</span>
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
              <th>Fee</th>
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
                <td>
                  <div className="fees-cell-primary">{p.fee?.description || 'Hostel Fee'}</div>
                  <div className="fees-cell-sub">Fee #{p.fee?.id}</div>
                </td>
                <td className="amount">{formatCurrency(p.amount)}</td>
                <td>{p.paymentMethod}</td>
                <td>{p.transactionId || '--'}</td>
                <td><span className={statusBadgeClass(p.status)}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="dashboard-layout">
      <Sidebar userType="student" />
      <div className="dashboard-main">
        <Navbar title="Payment History" />
        <main className="dashboard-content">
          <div className="fees-header">
            <h2>Payment History</h2>
          </div>
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default StudentPayments;
