const { getConnection } = require('../../lib/db');

const sidebarData = (req) => ({ user: req.session.email || '-' });

const STATUS_LABELS = { 0: 'Menunggu', 1: 'Disetujui', 2: 'Ditolak', 3: 'Butuh Revisi' };

exports.getDaftarPermohonan = async (req, res, next) => {
    try {
        const db = await getConnection();
        const page   = Math.max(1, parseInt(req.query.page)  || 1);
        const limit  = Math.max(1, parseInt(req.query.limit) || 10);
        const offset = (page - 1) * limit;
        const search       = req.query.search || '';
        const filterStatus = req.query.status || '';

        const conditions = ["srr.refund_type = 'UKT'"];
        const params     = [];

        if (search.trim()) {
            conditions.push('(s.name LIKE ? OR s.regno LIKE ?)');
            params.push(`%${search.trim()}%`, `%${search.trim()}%`);
        }

        if (['0', '1', '2', '3'].includes(filterStatus)) {
            conditions.push('sr.status = ?');
            params.push(Number(filterStatus));
        }

        const where = 'WHERE ' + conditions.join(' AND ');

        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) AS total
             FROM student_requests sr
             JOIN student_request_refund srr ON sr.id = srr.student_request_id
             JOIN students s ON sr.requested_by = s.id
             LEFT JOIN organization_units ou ON s.department_id = ou.id
             ${where}`,
            params
        );

        const [permohonan] = await db.query(
            `SELECT sr.id, s.name AS nama_mahasiswa, s.regno AS nim,
                    srr.refund_type, srr.refund_nominal, sr.requested_at,
                    sr.status AS status_code,
                    ou.name AS nama_departemen
             FROM student_requests sr
             JOIN student_request_refund srr ON sr.id = srr.student_request_id
             JOIN students s ON sr.requested_by = s.id
             LEFT JOIN organization_units ou ON s.department_id = ou.id
             ${where}
             ORDER BY sr.requested_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.render('admin/permohonan', {
            ...sidebarData(req),
            permohonan,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            search,
            filterStatus,
        });
    } catch (err) {
        next(err);
    }
};

exports.getDetailPermohonan = async (req, res, next) => {
    try {
        const db = await getConnection();
        const { id } = req.params;

        const [[permohonan]] = await db.query(
            `SELECT sr.id, sr.request_nunmber AS request_number, sr.status, sr.requested_at,
                    srr.id AS refund_id,
                    srr.refund_type, srr.refund_nominal, srr.reason,
                    srr.application_letter_file, srr.ukt_payment_receipt_file,
                    srr.rector_decree_file, srr.saving_book_fiel,
                    s.name AS nama_mahasiswa, s.regno AS nim, s.department_id,
                    ou.name AS nama_departemen
             FROM student_requests sr
             JOIN student_request_refund srr ON sr.id = srr.student_request_id
             JOIN students s ON sr.requested_by = s.id
             LEFT JOIN organization_units ou ON s.department_id = ou.id
             WHERE sr.id = ? AND srr.refund_type = 'UKT'`,
            [id]
        );

        if (!permohonan) {
            return res.status(404).render('error', {
                message: 'Permohonan tidak ditemukan.',
                error: { status: 404, stack: '' },
            });
        }

        const [approvals] = await db.query(
            `SELECT * FROM student_request_refund_approvals
             WHERE student_request_refund_id = ?
             ORDER BY id ASC`,
            [permohonan.refund_id]
        );

        const adminApproval = approvals.find(a => a.level === 1) || null;
        const wd2HasActed   = approvals.some(a => a.level === 2);

        res.render('admin/detail-permohonan', {
            ...sidebarData(req),
            title: 'Detail Permohonan #' + id,
            permohonan,
            approvals,
            adminApproval,
            wd2HasActed,
        });
    } catch (err) {
        next(err);
    }
};

exports.verifikasiPermohonan = async (req, res) => {
    const { id } = req.params;
    const { status_verifikasi, catatan, nominal } = req.body;
    
    const db = await getConnection();
    const validStatuses = ['1', '2', '3'];
    if (!validStatuses.includes(String(status_verifikasi))) {
        return res.status(400).json({
            success: false,
            message: 'Status verifikasi tidak valid. Gunakan 1=Setujui, 2=Tolak, 3=Revisi.',
        });
    }

    const statusNum = Number(status_verifikasi);

    try {
        const [result] = await db.query(
            'UPDATE student_requests SET status = ? WHERE id = ?',
            [statusNum, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Permohonan tidak ditemukan.' });
        }

        const [[refund]] = await db.query(
            `SELECT srr.id FROM student_request_refund srr WHERE srr.student_request_id = ?`,
            [id]
        );

        if (!refund) {
            return res.status(404).json({ success: false, message: 'Data refund tidak ditemukan.' });
        }

        if (statusNum === 1 && nominal) {
            await db.query(
                'UPDATE student_request_refund SET refund_nominal = ? WHERE student_request_id = ?',
                [Number(nominal), id]
            );
        }

        const [[existing]] = await db.query(
            `SELECT id FROM student_request_refund_approvals WHERE student_request_refund_id = ? AND level = 1`,
            [refund.id]
        );

        if (existing) {
            await db.query(
                `UPDATE student_request_refund_approvals
                 SET status = ?, approval_reason = ?, updated_at = NOW()
                 WHERE id = ?`,
                [statusNum, catatan?.trim() || null, existing.id]
            );
        } else {
            const [[{ maxId }]] = await db.query(
                'SELECT COALESCE(MAX(id), 0) + 1 AS maxId FROM student_request_refund_approvals'
            );

            await db.query(
                `INSERT INTO student_request_refund_approvals
                (id, student_request_refund_id, approved_by, approval_reason, approval_position, status, level)
                VALUES (?, ?, ?, ?, 'Admin Akademik', ?, 1)`,
                [maxId, refund.id, req.session.userId || null, catatan?.trim() || null, statusNum]
            );
        }

        res.json({
            success: true,
            message: `Permohonan berhasil di${STATUS_LABELS[statusNum]?.toLowerCase() || 'proses'}.`,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.batalkanVerifikasi = async (req, res) => {
    const { id } = req.params;
    try {
        const db = await getConnection();
        const [result] = await db.query(
            'UPDATE student_requests SET status = 0 WHERE id = ? AND status IN (1, 2, 3)',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada verifikasi yang dapat dibatalkan.',
            });
        }

        const [[refund]] = await db.query(
            `SELECT srr.id FROM student_request_refund srr WHERE srr.student_request_id = ?`,
            [id]
        );

        if (refund) {
            await db.query(
                'DELETE FROM student_request_refund_approvals WHERE student_request_refund_id = ? AND level = 1',
                [refund.id]
            );
        }

        res.json({ success: true, message: 'Verifikasi Admin berhasil dibatalkan.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.hapusDraftPermohonan = async (req, res) => {
    try {
        const db = await getConnection();
        const [result] = await db.query(`
            DELETE sr FROM student_requests sr
            JOIN student_request_refund srr ON sr.id = srr.student_request_id
            WHERE sr.status = 0
              AND srr.refund_type = 'UKT'
              AND sr.requested_at < (
                  SELECT COALESCE(MIN(rp.end_date), NOW())
                  FROM ukt_refund_periods rp
                  WHERE rp.is_active = 0 AND rp.end_date <= CURDATE()
              )
        `);
        res.json({
            success: true,
            message: `${result.affectedRows} draf kadaluarsa berhasil dibersihkan.`,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};