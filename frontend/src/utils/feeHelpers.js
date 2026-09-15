// Shared helpers for the Fees & Payments module.

// Format a numeric amount as Indian Rupees, e.g. 3000 -> "₹3,000.00".
export const formatCurrency = (amount) => {
  const value = Number(amount) || 0;
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

// Format a date consistently with the rest of the app (locale date string).
export const formatDate = (value) => {
  if (!value) return '--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleDateString();
};

// Format a date + time for payment timestamps.
export const formatDateTime = (value) => {
  if (!value) return '--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleString();
};

// Map a fee/payment status to a CSS badge class.
export const statusBadgeClass = (status) => {
  switch (status) {
    case 'PENDING':
      return 'status-badge status-pending';
    case 'PARTIAL':
      return 'status-badge status-partial';
    case 'PAID':
      return 'status-badge status-paid';
    case 'OVERDUE':
      return 'status-badge status-overdue';
    case 'SUCCESS':
      return 'status-badge status-success';
    case 'FAILED':
      return 'status-badge status-failed';
    default:
      return 'status-badge';
  }
};

// Extract a user-friendly message from an axios error.
export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message === 'Network Error') {
    return 'Unable to reach the server. Please check your connection.';
  }
  return fallback;
};

// Payment methods available to students in the UI.
// CASH is intentionally excluded: the project has no student cash-recording flow.
export const STUDENT_PAYMENT_METHODS = ['UPI', 'CARD', 'ONLINE'];
