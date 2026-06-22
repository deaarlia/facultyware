  const bcrypt = require("bcryptjs");
  const db = require("../lib/db");

  const index = (req, res) => {
    res.render("index", { title: "Express" });
  };

  const home = (req, res) => {
    res.render("home", { title: "Home", user: req.session.email });
  };

  const loginPage = (req, res) => {
    if (req.session.userId) {
      const roles = req.session.roles || [];
      if (roles.includes('admin')) return res.redirect("/dashboard");
      return res.redirect("/home");
    }
    res.render("login", { title: "Login", error: null });
  };

  const login = async (req, res, next) => {
    const { email, password } = req.body;

    try {
      const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

      if (rows.length === 0) {
        return res.render("login", { title: "Login", error: "Invalid email or password" });
      }

      const user = rows[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.render("login", { title: "Login", error: "Invalid email or password" });
      }

      req.session.userId = user.id;
      req.session.email = user.email;

      const [roleRows] = await db.query(`
        SELECT r.name 
        FROM roles r
        JOIN model_has_roles mhr ON r.id = mhr.role_id
        WHERE mhr.model_id = ?
      `, [Number(user.id)]);

      const roles = roleRows.map(row => row.name.toLowerCase());
      req.session.roles = roles;

      if (roles.includes('admin')) {
        req.session.cookie.maxAge = 1000 * 60 * 60 * 2;
      } else if (roles.includes('dekan') || roles.includes('wd')) {
        req.session.cookie.maxAge = 1000 * 60 * 15;
      } else {
        req.session.cookie.maxAge = 1000 * 60 * 60 * 1;
      }

      if (roles.includes('admin')) {
        return res.redirect("/dashboard");
      }
      return res.redirect("/home");

    } catch (err) {
      next(err);
    }
  };

  const logout = (req, res, next) => {
    req.session.destroy((err) => {
      if (err) return next(err);
      res.redirect("/login");
    });
  };

  module.exports = { index, home, loginPage, login, logout };