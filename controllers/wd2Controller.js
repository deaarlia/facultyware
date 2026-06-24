const { getConnection } = require('../lib/db');

const getDaftarPermohonan = async (req, res) => {
  try {
    const db = await getConnection();

    const querySQL = `
      SELECT 
        srr.id AS student_request_refund_id,
        st.name AS nama,
        st.regno AS nim,
        st.department_id,
        srr.application_letter_file AS appLetter, 
        srr.ukt_payment_receipt_file AS uktReceipt,   
        srr.rector_decree_file AS rectorDecree,       
        COALESCE(latest_app.level, 0) AS level,
        COALESCE(latest_app.status, 1) AS approval_status,
        latest_app.approval_reason AS catatan
      FROM student_request_refund srr
      LEFT JOIN student_requests sr ON srr.student_request_id = sr.id
      /* FIX: Gunakan requested_by sesuai struktur database-mu */
      LEFT JOIN students st ON sr.requested_by = st.id
      LEFT JOIN (
        SELECT ap1.*
        FROM student_request_refund_approvals ap1
        INNER JOIN (
          SELECT student_request_refund_id, MAX(id) as max_id
          FROM student_request_refund_approvals
          GROUP BY student_request_refund_id
        ) ap2 ON ap1.id = ap2.max_id
      ) latest_app ON srr.id = latest_app.student_request_refund_id
      ORDER BY srr.id DESC
    `;

    const [rows] = await db.query(querySQL);

    const dataClean = rows.map(item => {
      let deptString = "TEKNIK KOMPUTER";
      if (item.department_id === 2) deptString = "SISTEM INFORMASI";
      if (item.department_id === 3) deptString = "INFORMATIKA";

      const lvl = Number(item.level || 0);
      const appStatus = Number(item.approval_status || 0);

      let statusSistem = 'Menunggu Validasi Admin';
      
      if (lvl === 2 && appStatus === 3) {
        statusSistem = 'Ditolak oleh Wakil Dekan 2';
      } else if (lvl === 2 && appStatus === 2) {
        statusSistem = 'Selesai / Disetujui Wakil Dekan 2';
      } else if (lvl === 1) {
        statusSistem = 'Menunggu Validasi Wakil Dekan 2';
      }

      return {
        student_request_refund_id: item.student_request_refund_id,
        nama: item.nama || "Data Nama Tidak Ditemukan", 
        nim: item.nim || "Data NIM Tidak Ditemukan",
        departemen: deptString,
        appLetter: item.appLetter,
        uktReceipt: item.uktReceipt,
        rectorDecree: item.rectorDecree,
        level: lvl, 
        status_sistem: statusSistem
      };
    });

    res.status(200).json({ success: true, data: dataClean });
  } catch (error) {
    console.error("Error getDaftarPermohonan:", error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

const updateKeputusanFinal = async (req, res) => {
  const { id_pengajuan, status_sistem, catatan } = req.body; 
  
  if (!id_pengajuan) return res.status(400).json({ success: false, message: 'ID Pengajuan kosong' });

  try {
    const db = await getConnection();
    let statusAngkaApprovals = 1; 
    let statusAngkaMasterRequest = 0; 

    const stSistem = String(status_sistem).toLowerCase(); 
    
    if (stSistem.includes('setuju') || stSistem.includes('selesai')) {
      statusAngkaApprovals = 2;       
      statusAngkaMasterRequest = 1;   
    } else if (stSistem.includes('tolak')) {
      statusAngkaApprovals = 3;       
      statusAngkaMasterRequest = 2;   
    }

    const [[refundData]] = await db.query(
      'SELECT student_request_id FROM student_request_refund WHERE id = ?',
      [id_pengajuan]
    );

    if (!refundData) return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });

    const masterRequestId = refundData.student_request_id;

    const [existingCheck] = await db.query(
      `SELECT id FROM student_request_refund_approvals WHERE student_request_refund_id = ? AND level = 2`,
      [id_pengajuan]
    );

    if (existingCheck.length > 0) {
      await db.query(`
        UPDATE student_request_refund_approvals 
        SET status = ?, approval_reason = ?, updated_at = NOW() 
        WHERE student_request_refund_id = ? AND level = 2
      `, [statusAngkaApprovals, catatan || '-', id_pengajuan]);
    } else {
      const [rowsId] = await db.query('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM student_request_refund_approvals');
      const finalApprovalId = rowsId[0].nextId;

      await db.query(`
        INSERT INTO student_request_refund_approvals 
        (id, student_request_refund_id, approved_by, approval_reason, approval_position, status, level, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'Wakil Dekan 2', ?, 2, NOW(), NOW())
      `, [finalApprovalId, id_pengajuan, req.session?.userId || 5, catatan || '-', statusAngkaApprovals]);
    }

    await db.query(
      'UPDATE student_requests SET status = ? WHERE id = ?',
      [statusAngkaMasterRequest, masterRequestId]
    );

    res.status(200).json({ success: true, message: 'Keputusan berhasil disimpan!' });
  } catch (error) {
    console.error("Error update keputusan:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getLaporanEkspor = async (req, res) => {
  try {
    const db = await getConnection();
    const querySQL = `
      SELECT 
        st.regno AS NIM,
        st.name AS Nama_Mahasiswa,
        CASE 
          WHEN st.department_id = 2 THEN 'SISTEM INFORMASI'
          WHEN st.department_id = 3 THEN 'INFORMATIKA'
          ELSE 'TEKNIK KOMPUTER'
        END AS Departemen,
        CASE 
          WHEN a.status = 2 THEN 'Disetujui Final'
          WHEN a.status = 3 THEN 'Ditolak'
          ELSE 'Diproses'
        END AS Status_Akhir,
        a.updated_at AS Tanggal_Keputusan
      FROM student_request_refund_approvals a
      LEFT JOIN student_request_refund srr ON a.student_request_refund_id = srr.id
      LEFT JOIN student_requests sr ON srr.student_request_id = sr.id
      /* FIX: Gunakan requested_by di query ekspor juga */
      LEFT JOIN students st ON sr.requested_by = st.id
      WHERE a.approval_position = 'Wakil Dekan 2' OR a.level = 2
    `;
    
    const [rows] = await db.query(querySQL);

    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error("Error database saat ekspor laporan:", error);
    res.status(500).json({ success: false, message: 'Gagal mengekspor laporan akhir dari database.' });
  }
};

// --- FIX: FUNGSI INI SUDAH DIPERBARUI UNTUK SK REKTORAT ---
const getEndpointRekomendasiFinal = async (req, res) => {
  try {
    const db = await getConnection();

    // Query khusus mengambil mahasiswa yang sudah disetujui di Level 2 (WD2)
    const querySQL = `
      SELECT 
        srr.id AS id_pengajuan,
        st.name AS nama,
        st.regno AS nim,
        CASE 
          WHEN st.department_id = 2 THEN 'SISTEM INFORMASI'
          WHEN st.department_id = 3 THEN 'INFORMATIKA'
          ELSE 'TEKNIK KOMPUTER'
        END AS departemen,
        a.approval_position,
        a.approval_reason AS catatan_final,
        a.updated_at AS tanggal_disetujui
      FROM student_request_refund_approvals a
      JOIN student_request_refund srr ON a.student_request_refund_id = srr.id
      JOIN student_requests sr ON srr.student_request_id = sr.id
      JOIN students st ON sr.requested_by = st.id
      WHERE a.level = 2 AND a.status = 2
      ORDER BY a.updated_at DESC
    `;

    const [rows] = await db.query(querySQL);

    res.status(200).json({
      success: true,
      message: "Data rekomendasi final penerima pengembalian UKT tingkat fakultas",
      total_mahasiswa: rows.length,
      generated_at: new Date().toISOString(),
      data: rows
    });
  } catch (error) {
    console.error("Error getEndpointRekomendasiFinal:", error);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal memuat data rekomendasi final dari database' 
    });
  }
};

module.exports = {
  getDaftarPermohonan,
  updateKeputusanFinal,
  getLaporanEkspor,
  getEndpointRekomendasiFinal
};