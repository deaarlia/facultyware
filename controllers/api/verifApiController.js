const db = require('../../lib/db');

exports.getVerifikasiTahap1JSON = async (req, res) => {
    try {
        const { status, nim, from, to, limit = 100, page = 1 } = req.query;

        const conditions = ["srr.refund_type = 'UKT'"];
        const params = [];

        if (status && ['0','1','2'].includes(String(status))) {
            conditions.push('sr.status = ?');
            params.push(Number(status));
        }

        if (nim) { conditions.push('s.regno LIKE ?'); params.push(`%${nim}%`); }
        if (from) { conditions.push('DATE(sr.requested_at) >= ?'); params.push(from); }
        if (to)   { conditions.push('DATE(sr.requested_at) <= ?'); params.push(to); }

        const where  = 'WHERE ' + conditions.join(' AND ');
        const _limit  = Math.min(500, Math.max(1, parseInt(limit) || 100));
        const _offset = (Math.max(1, parseInt(page) || 1) - 1) * _limit;

        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) AS total
             FROM student_requests sr
             JOIN student_request_refund srr ON sr.id = srr.student_request_id
             JOIN students s ON sr.requested_by = s.id
             ${where}`, params
        );

        const [data] = await db.query(
            `SELECT sr.id AS request_id,
                    sr.request_nunmber AS request_number,
                    s.regno AS student_nim,
                    s.name  AS student_name,
                    s.department_id AS faculty_department_id,
                    srr.refund_type,
                    CAST(srr.refund_nominal AS DECIMAL(14,2)) AS refund_amount,
                    CASE sr.status
                        WHEN 0 THEN 'pending'
                        WHEN 1 THEN 'approved'
                        WHEN 2 THEN 'rejected'
                    END AS verification_status,
                    DATE_FORMAT(sr.requested_at, '%Y-%m-%dT%H:%i:%sZ') AS submitted_at
             FROM student_requests sr
             JOIN student_request_refund srr ON sr.id = srr.student_request_id
             JOIN students s ON sr.requested_by = s.id
             ${where}
             ORDER BY sr.requested_at DESC
             LIMIT ? OFFSET ?`,
            [...params, _limit, _offset]
        );

        res.status(200).json({
            status: 'success',
            source: 'Fakultas — Verifikasi Validasi UKT',
            purpose: 'Cross-check data pengembalian UKT tingkat universitas',
            generated_at: new Date().toISOString(),
            pagination: { page: parseInt(page), limit: _limit, total, total_pages: Math.ceil(total / _limit) },
            filters: { status: status || 'all', nim: nim || null, from: from || null, to: to || null },
            data,
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};