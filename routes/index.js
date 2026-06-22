var express = require("express");
var router = express.Router();
const indexController = require("../controllers/indexController");
const { isAuthenticated } = require("../middlewares/auth");
const wd2Router = require('./wd2Routes');
/* GET home page. */
router.get("/", indexController.index);

router.get("/home", isAuthenticated, indexController.home);

router.get("/login", indexController.loginPage);

router.post("/login", indexController.login);

router.get("/logout", indexController.logout);

router.use('/api/wd2', wd2Router);

module.exports = router;

module.exports = router;
