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
    return res.redirect("/home");
  }
  res.render("login", { title: "Login", error: null });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // 🟢 Debug logs to see exactly what data is arriving from the frontend form
    console.log("--- LOGIN ATTEMPT ---");
    console.log("Form email value:", email);
    console.log("Form password value:", password);

    // Running the database fetch (Only one 'const [rows]' declaration here!)
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    console.log("Database rows found count:", rows.length);
    if (rows.length > 0) {
      console.log("Database password hash:", rows[0].password);
    }
    console.log("----------------------");

    // Check if user exists
    if (rows.length === 0) {
      return res.render("login", {
        title: "Login",
        error: "Invalid email or password",
      });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.render("login", {
        title: "Login",
        error: "Invalid email or password",
      });
    }

    // Set session core identifiers
    req.session.userId = user.id;
    req.session.email = user.email;

    // Set contextual, inactivity-based session lifetimes
    if (user.email === 'admin@unand.ac.id') {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 2; // Admin gets 2 hours
    } else if (user.email.includes('dekan') || user.email.includes('wd')) {
      req.session.cookie.maxAge = 1000 * 60 * 15;     // Wakil Dekan II gets 15 mins
    } else {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 1; // Students get 1 hour
    }

    res.redirect("/home");
  } catch (err) {
    next(err);
  }
};

const logout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/login");
  });
};

module.exports = {
  index,
  home,
  loginPage,
  login,
  logout
};
