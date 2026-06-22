const bcrypt = require("bcryptjs");
const { getConnection } = require("../lib/db");

const index = (req, res) => {
  res.redirect("/login");
};

const home = (req, res) => {
  res.render("home", { title: "Home", user: req.session.email });
};

const loginPage = (req, res) => {
  if (req.session.userId) {
    const roles = req.session.roles || [];
    if (roles.includes('admin')) return res.redirect("/dashboard");
    if (roles.includes('mahasiswa')) return res.redirect("/mahasiswa");
    if (roles.includes('wd2') || roles.includes('wd')) return res.redirect("/wd2");
    return res.redirect("/home");
  }
  res.render("login", { title: "Login", error: null });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const db = await getConnection();
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
    req.session.name = user.name;

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
    } else if (roles.includes('dekan') || roles.includes('wd') || roles.includes('wd2')) {
      req.session.cookie.maxAge = 1000 * 60 * 15;     
    } else {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 1; 
    }

    if (roles.includes('mahasiswa')) {
      const [studentRows] = await db.query(
        "SELECT id, name, regno, department_id FROM students WHERE email = ? OR campus_email = ?", 
        [user.email, user.email]
      );

      if (studentRows.length > 0) {
        req.session.studentId = studentRows[0].id;
        req.session.studentName = studentRows[0].name;
        req.session.studentNim = studentRows[0].regno;
        req.session.departmentId = studentRows[0].department_id;
      } else {
        console.log(`⚠️ Peringatan: Akun ${user.email} tidak ditemukan di tabel 'students'.`);
      }
    }

    req.session.save((err) => {
      if (err) return next(err);
      
      if (roles.includes('wd2') || roles.includes('wd')) {
        return res.redirect("/wd2"); 
      }
      if (roles.includes('mahasiswa')) {
        return res.redirect("/mahasiswa"); 
      }
      if (roles.includes('admin')) {
        return res.redirect("/dashboard");
      }
      return res.redirect("/home");
    });

  } catch (err) {
    next(err);
  }
};

const logout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('session_cookie_name');
    res.redirect("/login");
  });
};

const mahasiswaPage = (req, res) => {
  const roles = req.session.roles || [];
  if (!roles.includes('mahasiswa')) {
    return res.redirect("/login");
  }
  res.render("mahasiswa", {
    title: "Dashboard Mahasiswa",
    studentId: req.session.studentId || '',
    studentName: req.session.studentName || '',
    studentNim: req.session.studentNim || '',
    departmentId: req.session.departmentId || ''
  });
};

const wd2Page = (req, res) => {
  const roles = req.session.roles || [];
  if (!roles.includes('wd2') && !roles.includes('wd')) {
    return res.redirect("/login");
  }
  res.render("wd2", {
    title: "Dashboard WD II",
    name: req.session.name || '',
    email: req.session.email || ''
  });
};

module.exports = { index, home, loginPage, login, logout, mahasiswaPage, wd2Page };