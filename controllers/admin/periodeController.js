const { getConnection } = require('../../lib/db');

const sidebarData = (req) => ({ user: req.session.email || '-' });

exports.getPeriodeList = async (req, res, next) => {
    try {
        const db = await getConnection();
        const [periodes] = await db.query(
            'SELECT * FROM ukt_refund_periods ORDER BY created_at DESC'
        );
        res.render('admin/periode', {
            title: 'Periode Permohonan',
            ...sidebarData(req),
            periodes,
        });
    } catch (err) {
        next(err);
    }
};

exports.createPeriode = async (req, res) => {
    const { name, start_date, end_date } = req.body;
    const errors = [];

    if (!name || !name.trim()) errors.push('Nama periode wajib diisi.');
    if (!start_date) errors.push('Tanggal mulai wajib diisi.');
    if (!end_date) errors.push('Tanggal akhir (deadline) wajib diisi.');
    if (start_date && end_date && new Date(start_date) >= new Date(end_date))
        errors.push('Tanggal mulai harus sebelum tanggal akhir.');

    if (errors.length > 0) return res.status(400).json({ success: false, errors });

    try {
        const db = await getConnection();
        const [result] = await db.query(
            'INSERT INTO ukt_refund_periods (name, start_date, end_date, is_active) VALUES (?, ?, ?, 1)',
            [name.trim(), start_date, end_date]
        );
        res.json({ success: true, message: 'Periode berhasil dibuat.', id: result.insertId });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updatePeriode = async (req, res) => {
    const { id } = req.params;
    const { name, start_date, end_date } = req.body;
    const errors = [];

    if (!name || !name.trim()) errors.push('Nama periode wajib diisi.');
    if (!start_date) errors.push('Tanggal mulai wajib diisi.');
    if (!end_date) errors.push('Tanggal akhir wajib diisi.');
    if (start_date && end_date && new Date(start_date) >= new Date(end_date))
        errors.push('Tanggal mulai harus sebelum tanggal akhir.');

    if (errors.length > 0) return res.status(400).json({ success: false, errors });

    try {
        const db = await getConnection();
        const [result] = await db.query(
            'UPDATE ukt_refund_periods SET name = ?, start_date = ?, end_date = ? WHERE id = ?',
            [name.trim(), start_date, end_date, id]
        );
        if (result.affectedRows === 0)
            return res.status(404).json({ success: false, message: 'Periode tidak ditemukan.' });
        res.json({ success: true, message: 'Periode berhasil diperbarui.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.togglePeriode = async (req, res) => {
    const { id } = req.params;
    try {
        const db = await getConnection();
        const [[periode]] = await db.query('SELECT * FROM ukt_refund_periods WHERE id = ?', [id]);
        if (!periode)
            return res.status(404).json({ success: false, message: 'Periode tidak ditemukan.' });

        const newStatus = periode.is_active ? 0 : 1;
        await db.query('UPDATE ukt_refund_periods SET is_active = ? WHERE id = ?', [newStatus, id]);
        res.json({
            success: true,
            is_active: newStatus,
            message: newStatus ? 'Periode berhasil dibuka.' : 'Periode berhasil ditutup.',
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deletePeriode = async (req, res) => {
    const { id } = req.params;
    try {
        const db = await getConnection();
        const [result] = await db.query('DELETE FROM ukt_refund_periods WHERE id = ?', [id]);
        if (result.affectedRows === 0)
            return res.status(404).json({ success: false, message: 'Periode tidak ditemukan.' });
        res.json({ success: true, message: 'Periode berhasil dihapus.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};