const db = require('../../lib/db');

const sidebarData = (req) => ({ user: req.session.email || '-' });

exports.getDashboard = async (req, res, next) => {
  try {
  
    const [[{ total }]] = await db.query(`
      SELECT COUNT(*) as total
      FROM student_requests sr
      JOIN student_request_refund srr ON sr.id = srr.student_request_id
      WHERE srr.refund_type = 'UKT'
    `);

    const [[{ pending }]] = await db.query(`
      SELECT COUNT(*) as pending
      FROM student_requests sr
      JOIN student_request_refund srr ON sr.id = srr.student_request_id
      WHERE srr.refund_type = 'UKT' AND sr.status = 0
    `);

    const [[{ approved }]] = await db.query(`
      SELECT COUNT(*) as approved
      FROM student_requests sr
      JOIN student_request_refund srr ON sr.id = srr.student_request_id
      WHERE srr.refund_type = 'UKT' AND sr.status = 1
    `);

    const [[{ rejected }]] = await db.query(`
      SELECT COUNT(*) as rejected
      FROM student_requests sr
      JOIN student_request_refund srr ON sr.id = srr.student_request_id
      WHERE srr.refund_type = 'UKT' AND sr.status = 2
    `);

    const [recent] = await db.query(`
      SELECT
        sr.id,
        sr.request_nunmber AS request_number, 
        s.name AS student_name,
        s.regno,
        srr.refund_nominal,
        sr.status,
        sr.requested_at
      FROM student_requests sr
      JOIN student_request_refund srr ON sr.id = srr.student_request_id
      JOIN students s ON sr.requested_by = s.id
      WHERE srr.refund_type = 'UKT'
      ORDER BY sr.requested_at DESC
      LIMIT 8
    `);

    res.render('admin/dashboard', {
      pageTitle: 'Dashboard — Pengembalian UKT',
      ...sidebarData(req),
      stats: { total, pending, approved, rejected },
      recent,
    });
  } catch (err) {
    next(err);
  }
};