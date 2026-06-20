const db = require('../lib/db');


exports.ajukanPengembalian = async (req, res) => {
    try {
        const { 
            student_id, 
            refund_type, 
            refund_nominal, 
            reason, 
            application_letter_file, 
            ukt_payment_receipt_file,
            rector_decree_file
        } = req.body;

       
        if (!student_id || !refund_type || !refund_nominal || !application_letter_file || !ukt_payment_receipt_file) {
            return res.status(400).json({
                success: false,
                message: "Mohon lengkapi data dan unggah berkas wajib."
            });
        }

       
        const query = `
            INSERT INTO student_request_refund (
                student_request_id, refund_type, refund_nominal, reason, 
                application_letter_file, ukt_payment_receipt_file, rector_decree_file
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.execute(query, [
            student_id, refund_type, refund_nominal, reason || '', 
            application_letter_file, ukt_payment_receipt_file, rector_decree_file || null
        ]);

        res.status(201).json({
            success: true,
            message: "Permohonan pengembalian UKT berhasil diajukan. Menunggu verifikasi Admin.",
            data: { id_pengajuan: result.insertId, status: "Menunggu Validasi Admin (Pending)" }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};



exports.ubahPengajuan = async (req, res) => {
    try {
        const { id } = req.params; 
        const { 
            refund_type, refund_nominal, reason, 
            application_letter_file, ukt_payment_receipt_file, 
            rector_decree_file, saving_book_file 
        } = req.body;

       
        const [approvals] = await db.execute(
            'SELECT status FROM student_request_refund_approvals WHERE student_request_refund_id = ? ORDER BY id DESC LIMIT 1', 
            [id]
        );
        
       
        if (approvals.length > 0) {
            const statusTerakhir = approvals[0].status;
            
            
            if (statusTerakhir !== 4) {
                return res.status(400).json({
                    success: false,
                    message: "Data tidak dapat diubah karena sedang dalam proses validasi atau sudah disetujui final."
                });
            }
        }

        
        const updateQuery = `
            UPDATE student_request_refund 
            SET refund_type = ?, refund_nominal = ?, reason = ?, 
                application_letter_file = ?, ukt_payment_receipt_file = ?, 
                rector_decree_file = ?, saving_book_fiel = ?
            WHERE id = ?
        `;
        
        await db.execute(updateQuery, [
            refund_type, refund_nominal, reason, 
            application_letter_file, ukt_payment_receipt_file, 
            rector_decree_file || null, saving_book_file || null, id
        ]);

        res.status(200).json({ success: true, message: "Data permohonan berhasil diperbarui." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.lihatStatusPengajuan = async (req, res) => {
    try {
        const { student_id } = req.query;

        if (!student_id) {
            return res.status(400).json({ success: false, message: "Parameter student_id diperlukan." });
        }

        const query = `
            SELECT 
                srr.id AS id_pengajuan,
                srr.refund_type,
                srr.refund_nominal,
                srr.reason AS alasan_mahasiswa,
                srr.created_at AS tanggal_pengajuan,
                srra.status AS status_code,
                srra.approval_position AS posisi_validator,
                srra.approval_reason AS catatan_validator
            FROM student_request_refund srr
            LEFT JOIN student_request_refund_approvals srra ON srr.id = srra.student_request_refund_id
            WHERE srr.student_request_id = ?
            ORDER BY srr.created_at DESC, srra.id DESC
        `;
        
        const [rows] = await db.execute(query, [student_id]);

        const riwayatDenganStatusText = rows.map(item => {
            let statusText = "Menunggu Validasi Admin";
            if (item.status_code === 1) statusText = "Disetujui Admin (Menunggu Validasi Fakultas)";
            if (item.status_code === 2) statusText = "Selesai / Disetujui Wakil Dekan 2";
            if (item.status_code === 3) statusText = "Ditolak oleh Wakil Dekan 2";
            if (item.status_code === 4) statusText = "Butuh Revisi Berkas";

            return {
                id_pengajuan: item.id_pengajuan,
                refund_type: item.refund_type,
                refund_nominal: item.refund_nominal,
                alasan_mahasiswa: item.alasan_mahasiswa,
                tanggal_pengajuan: item.tanggal_pengajuan,
                status_sistem: statusText,
                catatan_petugas: item.catatan_validator || "-"
            };
        });

        res.status(200).json({ success: true, data: riwayatDenganStatusText });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};