const express = require('express');
const router = express.Router();
const wd2Controller = require('../controllers/wd2Controller.js');

// Mengarahkan ke controller milikmu
router.get('/pengembalian-ukt/list', wd2Controller.getDaftarPermohonan);
router.post('/pengembalian-ukt/update', wd2Controller.updateKeputusanFinal);

router.get('/permohonan/ekspor', wd2Controller.getLaporanEkspor);
router.get('/rekomendasi-final', wd2Controller.getEndpointRekomendasiFinal);

module.exports = router;