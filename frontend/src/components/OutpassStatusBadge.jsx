/**
 * Status badge for outpass records. Maps each OutpassStatus to a styled pill.
 */
const OutpassStatusBadge = ({ status }) => {
  const value = (status || '').toUpperCase();
  const className = `op-badge op-badge-${value.toLowerCase()}`;
  const label = value.charAt(0) + value.slice(1).toLowerCase();
  return <span className={className}>{label}</span>;
};

export default OutpassStatusBadge;
