const express = require('express');
const router = express.Router();
const wd2Controller = require('../controllers/wd2Controller.js');

router.get('/permohonan', wd2Controller.getDaftarPermohonan);

router.put('/permohonan/:id/keputusan', wd2Controller.updateKeputusanFinal);

router.get('/permohonan/ekspor', wd2Controller.getLaporanEkspor);

router.get('/rekomendasi-final', wd2Controller.getEndpointRekomendasiFinal);

module.exports = router;