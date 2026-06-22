
const { getConnection } = require('../lib/db');

// 1. GET: Semua permohonan masuk langsung ke WD 2 (Bypass Admin untuk Testing)
const getDaftarPermohonan = async (req, res) => {
  try {
    const db = await getConnection();
    const querySQL = `
      SELECT 
        COALESCE(a.id, srr.id) AS id, 
        srr.id AS student_request_refund_id,
        COALESCE(a.level, 0) AS level, -- Jika data baru/NULL otomatis diatur ke lvl 0 (Admin)
        a.status,
        a.approval_reason AS catatan,
        st.name AS nama,
        st.regno AS nim,
        st.department_id,
        srr.application_letter_file AS appLetter, 
        srr.ukt_payment_receipt_file AS uktReceipt,   
        srr.rector_decree_file AS rectorDecree,       
        CASE 
          WHEN a.level = 2 THEN 'Selesai / Disetujui Wakil Dekan 2'
          WHEN a.level = 1 THEN 'Menunggu Validasi Wakil Dekan 2'
          ELSE 'Menunggu Validasi Admin' -- Berlaku untuk lvl 0 atau jika data approval belum dibuat
        END AS status_sistem
      FROM student_request_refund srr
      LEFT JOIN student_request_refund_approvals a ON srr.id = a.student_request_refund_id
      LEFT JOIN students st ON srr.student_request_id = st.id
      ORDER BY srr.id DESC
    `;

    const [rows] = await db.query(querySQL);

    const dataClean = rows.map(item => {
      const namaMahasiswa = item.nama ? item.nama : "Mahasiswa Baru (Simulasi)";
      const nimMahasiswa = item.nim ? item.nim : "NIM Belum Diatur";
      
      let deptString = "TEKNIK KOMPUTER";
      if (item.department_id === 2) deptString = "SISTEM INFORMASI";
      if (item.department_id === 3) deptString = "INFORMATIKA";

      return {
        ...item,
        nama: namaMahasiswa,
        nim: nimMahasiswa,
        departemen: deptString
      };
    });

    res.status(200).json({
      success: true,
      data: dataClean
    });
  } catch (error) {
    console.error("[ERROR] Gagal mengambil data WD2:", error.message);
    res.status(500).json({
      success: false,
      message: 'Terjadi gangguan internal pada server database.'
    });
  }
};
// 2. POST: Aksi Keputusan Setuju / Tolak dari WD2
// Sinkron dengan payload: body: JSON.stringify({ id_pengajuan, status_sistem, catatan })
const updateKeputusanFinal = async (req, res) => {
  const { id_pengajuan, status_sistem, catatan } = req.body;
  
  if (!id_pengajuan) {
    return res.status(400).json({ success: false, message: 'ID Pengajuan tidak valid atau kosong' });
  }

  try {
    const db = await getConnection();
    // Konversi string status_sistem dari wd2.html menjadi angka status internal database kamu
    // Sesuai logika tabel: 2 = Disetujui, 3 = Ditolak
    let statusAngka = 1;
    if (status_sistem.includes('Disetujui') || status_sistem.includes('Selesai')) {
      statusAngka = 2;
    } else if (status_sistem.includes('Ditolak') || status_sistem.includes('Tolak')) {
      statusAngka = 3;
    }

    const queryUpdate = `
      UPDATE student_request_refund_approvals 
      SET status = ?, approval_reason = ?, updated_at = NOW() 
      WHERE id = ?
    `;
    
    const [result] = await db.query(queryUpdate, [statusAngka, catatan || '-', id_pengajuan]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Data permohonan tidak ditemukan di database.' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Keputusan Wakil Dekan 2 berhasil disimpan ke dalam database!' 
    });
  } catch (error) {
    console.error("Error database saat menyimpan keputusan:", error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui status keputusan di database.' });
  }
};

// 3. GET: Ekspor Laporan Akhir Keputusan WD2
// Sinkron dengan: fetch(`${BACKEND_URL}/api/wd2/permohonan/ekspor`)
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
      LEFT JOIN students st ON srr.student_request_id = st.id
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

// 4. GET: Endpoint tambahan jikalau dibutuhkan oleh router
const getEndpointRekomendasiFinal = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Endpoint rekomendasi final aktif"
  });
};

// EXPORT SEMUA FUNGSI AGAR DAPAT DI-IMPORT OLEH ROUTER
module.exports = {
  getDaftarPermohonan,
  updateKeputusanFinal,
  getLaporanEkspor,
  getEndpointRekomendasiFinal
};