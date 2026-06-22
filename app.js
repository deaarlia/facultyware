require('dotenv').config();
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const mahasiswaRoutes = require('./routes/mahasiswaRoutes');
const wd2Routes = require('./routes/wd2Routes');
const adminRoutes = require('./routes/adminRoutes');

const { isAuthenticated } = require('./middlewares/auth');
const verifApiCtrl = require('./controllers/api/verifApiController');
const { notFoundHandler, errorHandler } = require('./middlewares/error');

var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

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

app.use(session({
  key: 'session_cookie_name',
  secret: process.env.SESSION_SECRET || 'secret',
  store: sessionStore,
  resave: true,
  saveUninitialized: false,
  cookie: {}
}));

app.use('/api/mahasiswa', mahasiswaRoutes);
app.use('/api/wd2', wd2Routes);
app.get('/api/admin/verifikasi-tahap1', verifApiCtrl.getVerifikasiTahap1JSON);

app.use('/', adminRoutes);
app.use('/', indexRouter);
app.use('/users', usersRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;