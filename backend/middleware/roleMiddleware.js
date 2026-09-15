/**
 * Role authorization middleware factory
 * @param  {...string} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware function
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    
    // Check if user's role is in the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to access this resource.' 
      });
    }
    
    next();
  };
};

module.exports = { authorizeRoles };
