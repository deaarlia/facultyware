// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect("/login");
}

function hasRole(requiredRoles) {
  return (req, res, next) => {
    if (!req.session.userId) {
      return res.redirect("/login");
    }
    const roles = req.session.roles || [];
    const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    const hasRequiredRole = roles.some(role => rolesArray.includes(role.toLowerCase()));
    if (hasRequiredRole) {
      return next();
    }
    res.status(403).render("error", {
      message: "Forbidden: You do not have permission to access this resource.",
      error: { status: 403, stack: "" }
    });
  };
}

module.exports = {
  isAuthenticated,
  hasRole,
};
