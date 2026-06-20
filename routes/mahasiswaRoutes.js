const express = require('express');
const router = express.Router();
const mahasiswaController = require('../controllers/mahasiswaController');

router.post('/pengembalian-ukt', mahasiswaController.ajukanPengembalian);

router.put('/pengembalian-ukt/:id', mahasiswaController.ubahPengajuan);

router.get('/pengembalian-ukt/status', mahasiswaController.lihatStatusPengajuan);

module.exports = router;