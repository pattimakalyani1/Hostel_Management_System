import '../styles/dashboard.css';

const DashboardCard = ({ title, value, color = 'primary', subtitle }) => {
  return (
    <div className={`dashboard-card card-${color}`}>
      <div className="card-content">
        <span className="card-title">{title}</span>
        <p className="card-value">{value}</p>
        {subtitle && <span className="card-subtitle">{subtitle}</span>}
      </div>
    </div>
  );
};

export default DashboardCard;
