const { getConnection } = require('../../lib/db');
const exporter = require('../../utils/exporter');

const sidebarData = (req) => ({ user: req.session.email || '-' });

exports.eksporPage = async (req, res, next) => {
    try {
        const db = await getConnection();
        const [periodes] = await db.query(
            'SELECT * FROM ukt_refund_periods ORDER BY created_at DESC'
        );
        res.render('admin/export', {
            ...sidebarData(req),
            periodes,
        });
    } catch (err) {
        next(err);
    }
};

exports.downloadEkspor = async (req, res) => {
    const { format, periode_id } = req.query;
    try {
        const db = await getConnection();
        const conditions = ["srr.refund_type = 'UKT'", 'sr.status = 1'];
        const params = [];

        if (periode_id && periode_id !== 'all') {
            conditions.push('srr.ukt_refund_period_id = ?');
            params.push(periode_id);
        }

        const where = 'WHERE ' + conditions.join(' AND ');

        const [data] = await db.query(
            `SELECT s.regno,
                    s.name,
                    ou.name              AS Departemen,
                    srr.refund_type,
                    srr.refund_nominal,
                    sr.requested_at,
                    appr.approval_reason,
                    appr.updated_at      AS verified_at
             FROM student_requests sr
             JOIN student_request_refund srr ON sr.id = srr.student_request_id
             JOIN students s ON sr.requested_by = s.id
             LEFT JOIN organization_units ou ON s.department_id = ou.id
             LEFT JOIN student_request_refund_approvals appr
                    ON appr.student_request_refund_id = srr.id
                   AND appr.level = 1
             ${where}
             ORDER BY sr.requested_at DESC`,
            params
        );

        console.log('data[0]:', data[0]);
        return format === 'pdf'
            ? exporter.sendPDF(res, data)
            : await exporter.sendXLS(res, data);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};