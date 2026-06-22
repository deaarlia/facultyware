const express = require('express');
const router  = express.Router();
const { isAuthenticated, hasRole } = require('../middlewares/auth');

const dashboardCtrl  = require('../controllers/admin/dashboardController');
const periodeCtrl     = require('../controllers/admin/periodeController');
const permohonanCtrl = require('../controllers/admin/permohonanController');
const exportCtrl     = require('../controllers/admin/exportController');

const auth = [isAuthenticated, hasRole('admin')];

router.get('/dashboard',          ...auth, dashboardCtrl.getDashboard);
router.get('/ukt/periode',        ...auth, periodeCtrl.getPeriodeList);
router.get('/ukt/permohonan',     ...auth, permohonanCtrl.getDaftarPermohonan);
router.get('/ukt/permohonan/:id', ...auth, permohonanCtrl.getDetailPermohonan);
router.get('/ukt/export',         ...auth, exportCtrl.eksporPage);

router.post  ('/api/admin/periode',            ...auth, periodeCtrl.createPeriode);
router.put   ('/api/admin/periode/:id',        ...auth, periodeCtrl.updatePeriode);
router.patch ('/api/admin/periode/:id/toggle', ...auth, periodeCtrl.togglePeriode);
router.delete('/api/admin/periode/:id',        ...auth, periodeCtrl.deletePeriode);

router.delete('/api/admin/permohonan/draft/cleanup',  ...auth, permohonanCtrl.hapusDraftPermohonan);
router.post  ('/api/admin/permohonan/:id/verifikasi', ...auth, permohonanCtrl.verifikasiPermohonan);
router.delete('/api/admin/permohonan/:id/verifikasi', ...auth, permohonanCtrl.batalkanVerifikasi);

router.get('/api/admin/ekspor', ...auth, exportCtrl.downloadEkspor);

module.exports = router;