// ========================================================
// FILE: controllers/wd2Controller.js
// ========================================================

const mysql = require('mysql2/promise');

// Inisialisasi Koneksi Langsung ke Database 'facultyware'
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',          // Silakan sesuaikan jika user MySQL lokal kamu berbeda
  password: '',          // Silakan sesuaikan jika MySQL kamu menggunakan password
  database: 'facultyware', // Sesuai dengan nama database di phpMyAdmin kamu
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 1. GET: Antrean data untuk Dashboard WD2
// Sinkron dengan: fetch(`${BACKEND_URL}/api/wd2/pengembalian-ukt/list`)
const getDaftarPermohonan = async (req, res) => {
  try {
    // Query mandiri ke tabel approvals tanpa melakukan JOIN terlebih dahulu 
    // untuk memastikan server tidak crash jika tabel utama belum siap.
    const querySQL = `
      SELECT 
        id,
        student_request_refund_id,
        level,
        approval_position,
        status,
        approval_reason AS catatan,
        -- Menyediakan data fallback agar frontend wd2.html tidak kosong/error
        'Mahasiswa ID ' AS nama,
        student_request_refund_id AS nim,
        'FAKULTAS' AS departemen,
        NULL AS appLetter,
        NULL AS uktReceipt,
        NULL AS rectorDecree,
        CASE 
          WHEN status = 1 THEN 'Menunggu Validasi Wakil Dekan 2'
          WHEN status = 2 THEN 'Selesai / Disetujui Wakil Dekan 2'
          WHEN status = 3 THEN 'Ditolak'
          ELSE 'Menunggu Validasi Admin'
        END AS status_sistem
      FROM student_request_refund_approvals
      WHERE approval_position = 'Wakil Dekan 2' OR level = 2
    `;

    const [rows] = await db.query(querySQL);

    // Manipulasi nama sedikit agar terlihat rapi di tabel frontend
    const dataClean = rows.map(item => ({
      ...item,
      nama: `Mahasiswa #${item.student_request_refund_id}`
    }));

    res.status(200).json({
      success: true,
      data: dataClean
    });
  } catch (error) {
    console.error("[ERROR] Gagal mengambil data database:", error.message);
    // Mengembalikan response 500 JSON secara elegan, sehingga server Node.js tetap hidup
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
    const querySQL = `
      SELECT 
        r.nim AS NIM,
        r.nama AS Nama_Mahasiswa,
        r.departemen AS Departemen,
        a.status AS Status_Akhir,
        a.updated_at AS Tanggal_Keputusan
      FROM student_request_refund_approvals a
      LEFT JOIN student_request_refunds r ON a.student_request_refund_id = r.id
      WHERE a.approval_position = 'Wakil Dekan 2' OR a.level = 2
    `;
    
    const [rows] = await db.query(querySQL);

    // Kirimkan data mentah, proses pemformatan CSV akan ditangani sepenuhnya oleh fungsi eksporLaporanAkhir() di wd2.html
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