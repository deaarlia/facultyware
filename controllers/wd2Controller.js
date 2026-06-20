const db = require('../lib/db');

exports.getDaftarPermohonan = async (req, res) => {
    try {
        const query = `
            SELECT 
                srr.id AS id_permohonan,
                s.name AS nama_mahasiswa,
                s.regno AS nim,
                s.department_id AS id_departemen,
                srr.refund_type,
                srr.reason,
                srr.refund_nominal,
                srr.application_letter_file,
                srr.ukt_payment_receipt_file,
                srr.rector_decree_file,
                srr.saving_book_fiel,
                srr.created_at,
                srra.status AS status_code_admin
            FROM student_request_refund srr
            JOIN students s ON srr.student_request_id = s.id
            JOIN student_request_refund_approvals srra ON srr.id = srra.student_request_refund_id
            WHERE srra.level = 1 AND srra.status = 1 
            ORDER BY srr.created_at DESC
        `;

        const [daftarPermohonan] = await db.execute(query);

        res.status(200).json({
            success: true,
            message: "Berhasil mengambil daftar pemohon siap validasi WD 2",
            data: daftarPermohonan
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateKeputusanFinal = async (req, res) => {
    try {
        const { id } = req.params; 
        const { status_final, catatan, approved_by } = req.body; 
        
        const validStatuses = [2, 3, 4];

        if (!validStatuses.includes(Number(status_final))) {
            return res.status(400).json({ success: false, message: "Status keputusan final (INT) tidak valid." });
        }

        const id_approval_unik = Math.floor(Date.now() / 1000);
        const level_wd2 = 2;
        const posisi_wd2 = "Wakil Dekan 2";

        const query = `
            INSERT INTO student_request_refund_approvals (
                id, student_request_refund_id, level, approved_by, 
                approval_reason, approval_position, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        await db.execute(query, [
            id_approval_unik, 
            id, 
            level_wd2, 
            approved_by || 99, 
            catatan || '-', 
            posisi_wd2, 
            Number(status_final)
        ]);

        res.status(200).json({
            success: true,
            message: `Keputusan final WD2 berhasil disimpan dengan kode status: ${status_final}`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getLaporanEkspor = async (req, res) => {
    try {
        const query = `
            SELECT 
                s.regno AS NIM,
                s.name AS Nama_Mahasiswa,
                s.department_id AS ID_Departemen,
                srr.refund_type AS Jenis_Pengembalian,
                srr.refund_nominal AS Nominal_Refund,
                srra.status AS Status_Akhir,
                srra.updated_at AS Tanggal_Keputusan
            FROM student_request_refund srr
            JOIN students s ON srr.student_request_id = s.id
            JOIN student_request_refund_approvals srra ON srr.id = srra.student_request_refund_id
            WHERE srra.level = 2 AND srra.status IN (2, 3)
            ORDER BY srra.updated_at ASC
        `;

        const [laporanData] = await db.execute(query);

        res.status(200).json({
            success: true,
            data: laporanData
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getEndpointRekomendasiFinal = async (req, res) => {
    try {
        const query = `
            SELECT 
                s.regno AS student_nim,
                s.name AS student_name,
                s.department_id AS faculty_department_id,
                srr.refund_nominal AS approved_amount,
                srra.status AS final_status_code,
                srra.updated_at AS approval_date
            FROM student_request_refund srr
            JOIN students s ON srr.student_request_id = s.id
            JOIN student_request_refund_approvals srra ON srr.id = srra.student_request_refund_id
            WHERE srra.level = 2 AND srra.status = 2
        `;

        const [rekomendasiFinal] = await db.execute(query);

        res.status(200).json({
            status: "success",
            total_records: rekomendasiFinal.length,
            purpose: "Dasar Penerbitan SK Rektorat",
            recommendations: rekomendasiFinal
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};