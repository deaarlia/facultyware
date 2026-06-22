require('dotenv').config();
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
// [BARU] Import routes mahasiswa dan wd2
const mahasiswaRoutes = require('./routes/mahasiswaRoutes');
const wd2Routes = require('./routes/wd2Routes');
const adminRoutes = require('./routes/adminRoutes');

const { notFoundHandler, errorHandler } = require('./middlewares/error');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/wd2', wd2Routes);

// Session configuration
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  clearExpired: false,
  checkExpirationInterval: 0, 
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'id',
      expires: 'last_activity',
      data: 'payload'
    }
  }
});

// Middleware Session diletakkan di sini (di atas pendaftaran semua route)
app.use(session({
  key: 'session_cookie_name',
  secret: process.env.SESSION_SECRET || 'secret',
  store: sessionStore,
  resave: true,
  saveUninitialized: false,
  cookie: {
    // maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// [BARU & DIPINDAH] Registrasi API Endpoint untuk Mahasiswa dan Wakil Dekan 2
// Dipastikan berada di bawah middleware session agar bisa membaca req.session mahasiswa/dosen yang login
app.use('/api/mahasiswa', mahasiswaRoutes);
app.use('/api/wd2', wd2Routes);

// Base Web Routes
app.use('/', indexRouter);
app.use('/users', usersRouter);

// Admin routes (web pages + API)
app.use('/', adminRoutes);

// catch 404 and forward to error handler
app.use(notFoundHandler);

// error handler
app.use(errorHandler);

module.exports = app;