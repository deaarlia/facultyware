const { getConnection } = require('../lib/db');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        
        let prefix = 'file';
        if (file.fieldname === 'application_letter_file') prefix = 'surat';
        else if (file.fieldname === 'ukt_payment_receipt_file') prefix = 'ukt';
        else if (file.fieldname === 'rector_decree_file') prefix = 'sk';

        cb(null, prefix + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        const filetypes = /pdf/;
        const mimetype = file.mimetype === 'application/pdf';
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Hanya berkas PDF (.pdf) yang diperbolehkan!'));
    }
}).fields([
    { name: 'application_letter_file', maxCount: 1 },
    { name: 'ukt_payment_receipt_file', maxCount: 1 },
    { name: 'rector_decree_file', maxCount: 1 }
]);


exports.ajukanPengembalian = async (req, res) => {
    try {
        const db = await getConnection();
        const { nama, nim, departemen, whatsapp } = req.body;

        const appLetter = req.files && req.files['application_letter_file'] ? req.files['application_letter_file'][0].filename : null;
        const uktReceipt = req.files && req.files['ukt_payment_receipt_file'] ? req.files['ukt_payment_receipt_file'][0].filename : null;
        const rectorDecree = req.files && req.files['rector_decree_file'] ? req.files['rector_decree_file'][0].filename : null;

        console.log("Data Masuk:", { nama, nim, departemen, whatsapp, appLetter, uktReceipt, rectorDecree });

        if (!nama || !nim || !departemen || !whatsapp || !appLetter || !uktReceipt || !rectorDecree) {
            return res.status(400).json({
                success: false,
                message: "Mohon lengkapi seluruh data formulir dan pastikan ketiga berkas PDF wajib telah terunggah."
            });
        }

       
        let dep_id = 1;
        if (departemen === 'SISTEM INFORMASI') dep_id = 2;
        else if (departemen === 'INFORMATIKA') dep_id = 3;

        
        const [checkMhs] = await db.execute('SELECT id FROM students WHERE regno = ?', [nim]);
        let finalStudentId;

        if (checkMhs.length > 0) {
            finalStudentId = checkMhs[0].id;
            await db.execute(
                'UPDATE students SET name = ?, department_id = ?, phone_no = ? WHERE id = ?',
                [nama, dep_id, whatsapp, finalStudentId]
            );
        } else {
            const [maxMhsRow] = await db.execute('SELECT MAX(id) AS maxId FROM students');
            finalStudentId = (maxMhsRow[0].maxId || 0) + 1;

            await db.execute(
                'INSERT INTO students (id, name, regno, department_id, phone_no) VALUES (?, ?, ?, ?, ?)',
                [finalStudentId, nama, nim, dep_id, whatsapp]
            );
        }

        
        const [maxReqRow] = await db.execute('SELECT MAX(id) AS maxId FROM student_requests');
        const finalRequestId = (maxReqRow[0].maxId || 0) + 1;
        const nomorRequest = 'REQ-' + Date.now() + '-' + finalStudentId;

        await db.execute(
            `INSERT INTO student_requests (id, request_nunmber, status, requested_at, requested_by) 
             VALUES (?, ?, 0, NOW(), ?)` ,
            [finalRequestId, nomorRequest, finalStudentId]
        );

        
        const [maxRefundRow] = await db.execute('SELECT MAX(id) AS maxId FROM student_request_refund');
        const finalRefundId = (maxRefundRow[0].maxId || 0) + 1;
        
        const queryRefund = `
            INSERT INTO student_request_refund (
                id, student_request_id, refund_type, refund_nominal, reason, 
                application_letter_file, ukt_payment_receipt_file, rector_decree_file
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        
        const defaultRefundType = "UKT"; 
        const defaultNominal = 0;
        const defaultReason = "Pengajuan melalui sistem form";

        await db.execute(queryRefund, [
            finalRefundId,   
            finalRequestId, 
            defaultRefundType, 
            defaultNominal, 
            defaultReason, 
            appLetter,      
            uktReceipt,      
            rectorDecree
        ]);

        res.status(201).json({
            success: true,
            message: "Permohonan berhasil diajukan! Berkas fisik Anda telah aman tersimpan.",
            data: { id_pengajuan: finalRefundId }
        });
    } catch (error) {
        console.error("Error backend:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.ubahPengajuan = async (req, res) => {
    try {
        const db = await getConnection();
        const { id } = req.params; 
        const { nama, nim, departemen, whatsapp, student_id } = req.body;

        const appLetter = req.files && req.files['application_letter_file'] ? req.files['application_letter_file'][0].filename : null;
        const uktReceipt = req.files && req.files['ukt_payment_receipt_file'] ? req.files['ukt_payment_receipt_file'][0].filename : null;
        const rectorDecree = req.files && req.files['rector_decree_file'] ? req.files['rector_decree_file'][0].filename : null;

        
        const [approvals] = await db.execute(
            'SELECT status FROM student_request_refund_approvals WHERE student_request_refund_id = ? ORDER BY id DESC LIMIT 1', 
            [id]
        );
        
        if (approvals.length > 0) {
            const statusTerakhir = approvals[0].status;
            
            if (statusTerakhir !== 3 && statusTerakhir !== 4) {
                return res.status(400).json({
                    success: false,
                    message: "Data tidak dapat diubah karena sedang dalam proses validasi atau sudah disetujui final."
                });
            }
        }

        
        if (student_id) {
            let dep_id = 1;
            if (departemen === 'SISTEM INFORMASI') dep_id = 2;
            else if (departemen === 'INFORMATIKA') dep_id = 3;
            
            await db.execute(
                'UPDATE students SET name = ?, regno = ?, department_id = ?, phone_no = ? WHERE id = ?',
                [nama, nim, dep_id, whatsapp, student_id]
            );
        }

        
        let updateQuery = `UPDATE student_request_refund SET reason = ?`;
        let queryParams = ["Update data melalui sistem"];

        if (appLetter) { updateQuery += `, application_letter_file = ?`; queryParams.push(appLetter); }
        if (uktReceipt) { updateQuery += `, ukt_payment_receipt_file = ?`; queryParams.push(uktReceipt); }
        if (rectorDecree) { updateQuery += `, rector_decree_file = ?`; queryParams.push(rectorDecree); }

        updateQuery += ` WHERE id = ?`;
        queryParams.push(id);
        
        await db.execute(updateQuery, queryParams);

        const [refundRow] = await db.execute('SELECT student_request_id FROM student_request_refund WHERE id = ?', [id]);
        if (refundRow.length > 0) {
            await db.execute('UPDATE student_requests SET status = 0 WHERE id = ?', [refundRow[0].student_request_id]);
        }

        res.status(200).json({ success: true, message: "Data permohonan berhasil diperbarui." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.lihatStatusPengajuan = async (req, res) => {
    try {
        const db = await getConnection();
        const { student_id } = req.query;

        
        let query = `
            SELECT 
                srr.id AS id_pengajuan,
                srr.refund_type,
                srr.refund_nominal,
                srr.application_letter_file,
                srr.ukt_payment_receipt_file,
                srr.rector_decree_file,
                sr.requested_at AS tanggal_pengajuan,
                sr.status AS status_code,
                srra.status AS approval_status,
                srra.approval_position AS posisi_validator,
                srra.approval_reason AS catatan_validator,
                st.name AS student_name,
                st.regno AS student_nim,
                st.department_id,
                st.phone_no AS student_phone
            FROM student_request_refund srr
            JOIN student_requests sr ON srr.student_request_id = sr.id
            LEFT JOIN student_request_refund_approvals srra ON srra.id = (
                SELECT MAX(id) 
                FROM student_request_refund_approvals 
                WHERE student_request_refund_id = srr.id
            )
            LEFT JOIN students st ON sr.requested_by = st.id
        `;
        
        let queryParams = [];
        if (student_id) {
            query += ` WHERE sr.requested_by = ?`;
            queryParams.push(student_id);
        }
        
        query += ` ORDER BY sr.requested_at DESC`;
        
        const [rows] = await db.execute(query, queryParams);

        const riwayatDenganStatusText = rows.map(item => {
            
            let statusText = "Menunggu Validasi Admin";
            if (item.status_code === 1) statusText = "Disetujui Admin (Menunggu Validasi Fakultas)";
            if (item.status_code === 2) statusText = "Ditolak oleh Admin";
            if (item.status_code === 3) statusText = "Butuh Revisi Berkas";
            if (item.status_code === 4) statusText = "Butuh Revisi Berkas";

            
            if (item.posisi_validator === 'Wakil Dekan 2' || item.posisi_validator === 'Wakil Dekan II') {
                if (item.approval_status === 2) statusText = "Selesai / Disetujui Wakil Dekan 2";
                if (item.approval_status === 3) statusText = "Ditolak oleh Wakil Dekan 2";
            }

            let deptString = "TEKNIK KOMPUTER";
            if (item.department_id === 2) deptString = "SISTEM INFORMASI";
            if (item.department_id === 3) deptString = "INFORMATIKA";

            return {
                id_pengajuan: item.id_pengajuan,
                nama: item.student_name || "-",
                nim: item.student_nim || "-",
                departemen: item.department_id ? deptString : "-",
                no_hp: item.student_phone || "-",
                file_surat: item.application_letter_file ? `/uploads/${item.application_letter_file}` : null,
                file_ukt: item.ukt_payment_receipt_file ? `/uploads/${item.ukt_payment_receipt_file}` : null,
                file_sk: item.rector_decree_file ? `/uploads/${item.rector_decree_file}` : null,
                refund_type: item.refund_type,
                refund_nominal: item.refund_nominal,
                tanggal_pengajuan: item.tanggal_pengajuan,
                status_sistem: statusText,
                catatan_petugas: item.catatan_validator || "-"
            };
        });

        res.status(200).json({ success: true, data: riwayatDenganStatusText });
    } catch (error) {
        console.error("Error Get Riwayat:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};