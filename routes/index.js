var express = require("express");
var router = express.Router();
const indexController = require("../controllers/indexController");
const { isAuthenticated, hasRole } = require("../middlewares/auth");
const wd2Router = require('./wd2Routes');

router.get("/", indexController.index);

router.get("/home", isAuthenticated, indexController.home);

router.get("/login", indexController.loginPage);

router.post("/login", indexController.login);

router.get("/logout", indexController.logout);

router.get("/mahasiswa", isAuthenticated, hasRole("mahasiswa"), indexController.mahasiswaPage);

router.get("/wd2", isAuthenticated, hasRole(["wd2", "wd"]), indexController.wd2Page);

router.use('/api/wd2', wd2Router);

module.exports = router;
