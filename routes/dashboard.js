const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/auth");
const { dashboard } = require("../controllers/dashboardController");
 
// Middleware sederhana cek admin berdasarkan email
const isAdmin = (req, res, next) => {
  if (req.session.email === "admin@unand.ac.id") {
    return next();
  }
  res.status(403).render("error", {
    message: "Forbidden: Anda tidak memiliki akses ke halaman ini.",
    error: { status: 403, stack: "" },
  });
};
 
// router.get("/dashboard", isAuthenticated, isAdmin, dashboard);
router.get("/dashboard", dashboard);

module.exports = router;
 