const express = require('express');
const router = express.Router();
const mahasiswaController = require('../controllers/mahasiswaController');

// Rute POST untuk mengajukan form beserta berkasnya
router.post('/pengembalian-ukt', mahasiswaController.uploadFields, mahasiswaController.ajukanPengembalian);

// Rute PUT untuk mengubah pengajuan berdasarkan ID
router.put('/pengembalian-ukt/:id', mahasiswaController.ubahPengajuan);

// Rute GET untuk mengambil status/riwayat data pengajuan
router.get('/pengembalian-ukt/status', mahasiswaController.lihatStatusPengajuan);

module.exports = router;