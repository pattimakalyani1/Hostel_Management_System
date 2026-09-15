import { useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';

const DashboardCard = ({ title, value, color = 'primary', subtitle, to }) => {
  const navigate = useNavigate();
  const clickable = !!to;

  const handleClick = () => {
    if (to) navigate(to);
  };

  return (
    <div
      className={`dashboard-card card-${color} ${clickable ? 'card-clickable' : ''}`}
      onClick={clickable ? handleClick : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
    >
      <div className="card-content">
        <span className="card-title">{title}</span>
        <p className="card-value">{value}</p>
        {subtitle && <span className="card-subtitle">{subtitle}</span>}
      </div>
    </div>
  );
};

export default DashboardCard;
