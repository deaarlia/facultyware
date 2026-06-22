const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors'); // Library untuk mengatasi isu CORS

// Import Router bawaan proyek Anda
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const mahasiswaRouter = require('./routes/mahasiswaRoutes'); // Router khusus mahasiswa yang kita buat

const app = express();

// ==========================================
// 1. MIDDLEWARE UTAMA (Wajib paling atas)
// ==========================================
app.use(cors({ origin: '*' })); // Membuka akses untuk semua port frontend (Live Server)
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Menyediakan akses folder public dan upload file fisik
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// 2. REGISTRASI ROUTER / ENDPOINT
// ==========================================
app.use('/', indexRouter);
app.use('/users', usersRouter);

// Prefix global untuk mahasiswa. 
// Jalur di dalam routes/mahasiswa.js otomatis akan diawali dengan /api/mahasiswa
app.use('/api/mahasiswa', mahasiswaRouter);

// ==========================================
// 3. ERROR HANDLING (FALLBACK)
// ==========================================
// Menangkap request yang nyasar atau salah ketik URL
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: "Endpoint tidak ditemukan. Periksa kembali method (GET/POST) atau URL Anda."
    });
});

// Menangkap error internal server
app.use((err, req, res, next) => {
    console.error("Error pada Server:", err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Terjadi kesalahan internal pada server backend."
    });
});

module.exports = app; // Diekspor agar bisa dieksekusi oleh bin/www