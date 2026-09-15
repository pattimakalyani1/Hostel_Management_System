/**
 * Shared formatting + helpers for the Outpass module.
 */

export const formatDate = (value) => {
  if (!value) return '--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTime = (value) => {
  if (!value) return '--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatTime = (value) => {
  if (!value) return '--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Convert an axios error into a user-friendly message without leaking
 * internal/database details.
 */
export const getApiErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  const res = err?.response;
  if (!res) {
    return 'Unable to reach the server. Check your connection and try again.';
  }
  const data = res.data;
  if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors[0].message || fallback;
  }
  if (data?.message) {
    return data.message;
  }
  if (res.status === 403) return 'You do not have permission to perform this action.';
  if (res.status === 404) return 'The requested outpass was not found.';
  return fallback;
};
