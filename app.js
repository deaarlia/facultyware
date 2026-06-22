require('dotenv').config();
const express = require('express');
const path = require('path');
const logger = require('morgan');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const mahasiswaRoutes = require('./routes/mahasiswaRoutes');
const wd2Routes = require('./routes/wd2Routes');
const adminRoutes = require('./routes/adminRoutes');

const verifApiCtrl = require('./controllers/api/verifApiController');
const { notFoundHandler, errorHandler } = require('./middlewares/error');

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(cors({ origin: '*' }));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 1, // Minimize connections on Vercel
  ssl: {
    rejectUnauthorized: false
  },
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