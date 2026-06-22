const ExcelJS = require('exceljs');

exports.sendXLS = async (res, data) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistem Pengembalian UKT Fakultas';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Rekapitulasi UKT', {
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
    });

    sheet.mergeCells('A1:I1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Rekapitulasi Permohonan Pengembalian UKT';
    titleCell.font = { name: 'Calibri', size: 14, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 28;

    sheet.mergeCells('A2:I2');
    const subCell = sheet.getCell('A2');
    subCell.value = `Mahasiswa Disetujui Admin (Tahap 1) — Digenerate: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`;
    subCell.font = { name: 'Calibri', size: 9, color: { argb: 'FF64748B' } };
    subCell.alignment = { horizontal: 'center' };

    sheet.addRow([]);

    const HEADERS = ['No', 'NIM', 'Nama Mahasiswa', 'Departemen', 'Jenis Pengembalian', 'Nominal (Rp)', 'Tanggal Pengajuan', 'Catatan Admin', 'Tanggal Verifikasi'];
    const headerRow = sheet.addRow(HEADERS);
    headerRow.height = 22;
    headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });

    [6, 18, 28, 14, 22, 18, 20, 28, 20].forEach((w, i) => {
        sheet.getColumn(i + 1).width = w;
    });

    data.forEach((r, i) => {
        const row = sheet.addRow([
            i + 1,
            r.regno || '',
            r.name || '',
            String(r.Departemen || r.department_name || r.department_id || '-'),
            r.refund_type || '',
            r.refund_nominal ? Number(r.refund_nominal) : 0,
            r.requested_at ? new Date(r.requested_at).toLocaleDateString('id-ID') : '-',
            r.approval_reason || '-',
            r.verified_at ? new Date(r.verified_at).toLocaleDateString('id-ID') : '-',
        ]);

        row.getCell(6).numFmt = '#,##0';
        row.eachCell({ includeEmpty: true }, cell => {
            cell.border = { top: { style: 'hair' }, bottom: { style: 'hair' }, left: { style: 'hair' }, right: { style: 'hair' } };
            if (i % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        });
    });

    sheet.views = [{ state: 'frozen', ySplit: 4 }];

    const filename = `rekapitulasi-ukt-${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
};

const PDFDocument = require('pdfkit');

exports.sendPDF = (res, data) => {
    const now = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

    const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',   // ← dijamin landscape, tidak tergantung browser
        margin: 40,
    });

    const filename = `rekapitulasi-ukt-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // ── Header ──────────────────────────────────────────────────
    doc.fontSize(14).font('Helvetica-Bold')
       .text('Rekapitulasi Permohonan Pengembalian UKT', { align: 'center' });
    doc.fontSize(9).font('Helvetica').fillColor('#64748b')
       .text(`Mahasiswa yang Disetujui Admin (Tahap 1) — Digenerate: ${now}`, { align: 'center' });
    doc.moveDown(1);

    // ── Definisi kolom ──────────────────────────────────────────
    const pageWidth = doc.page.width - 80; // margin kiri + kanan = 40+40
    const cols = [
        { label: 'No',              key: 'no',              w: 0.04 },
        { label: 'NIM',             key: 'regno',           w: 0.10 },
        { label: 'Nama Mahasiswa',  key: 'name',            w: 0.16 },
        { label: 'Departemen',      key: 'dept',            w: 0.08 },
        { label: 'Jenis',           key: 'refund_type',     w: 0.09 },
        { label: 'Nominal (Rp)',    key: 'nominal',         w: 0.12 },
        { label: 'Tgl Pengajuan',   key: 'tglAjuan',        w: 0.10 },
        { label: 'Catatan Admin',   key: 'catatan',         w: 0.19 },
        { label: 'Tgl Verifikasi',  key: 'tglVerif',        w: 0.12 },
    ].map(c => ({ ...c, w: Math.floor(c.w * pageWidth) }));

    const rowHeight = 20;
    const headerHeight = 24;
    let x = 40;
    let y = doc.y;

    // ── Fungsi helper ────────────────────────────────────────────
    function drawCell(text, cx, cy, cw, ch, opts = {}) {
        const {
            bg = null,
            color = '#1e293b',
            fontSize = 8,
            font = 'Helvetica',
            align = 'left',
            bold = false,
        } = opts;

        if (bg) {
            doc.rect(cx, cy, cw, ch).fill(bg);
        }

        doc.font(bold ? 'Helvetica-Bold' : font)
           .fontSize(fontSize)
           .fillColor(color)
           .text(String(text ?? '-'), cx + 4, cy + (ch - fontSize) / 2, {
               width: cw - 8,
               height: ch,
               align,
               lineBreak: false,
               ellipsis: true,
           });
    }

    function drawRowBorder(cy, ch) {
        doc.rect(40, cy, pageWidth, ch).stroke('#e2e8f0');
        let bx = 40;
        cols.forEach(c => {
            doc.moveTo(bx, cy).lineTo(bx, cy + ch).stroke('#e2e8f0');
            bx += c.w;
        });
        doc.moveTo(bx, cy).lineTo(bx, cy + ch).stroke('#e2e8f0');
    }

    // ── Header tabel ─────────────────────────────────────────────
    doc.rect(x, y, pageWidth, headerHeight).fill('#1e293b');
    let cx = x;
    cols.forEach(c => {
        drawCell(c.label.toUpperCase(), cx, y, c.w, headerHeight, {
            color: '#ffffff',
            fontSize: 7.5,
            bold: true,
        });
        cx += c.w;
    });
    y += headerHeight;

    // ── Baris data ───────────────────────────────────────────────
    if (data.length === 0) {
        doc.rect(40, y, pageWidth, rowHeight).fill('#ffffff');
        doc.font('Helvetica').fontSize(9).fillColor('#94a3b8')
           .text('Tidak ada data.', 40, y + 6, { width: pageWidth, align: 'center' });
        y += rowHeight;
    } else {
        data.forEach((r, i) => {
            // Cek apakah perlu halaman baru
            if (y + rowHeight > doc.page.height - 60) {
                doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
                y = 40;

                // Ulangi header tabel di halaman baru
                doc.rect(40, y, pageWidth, headerHeight).fill('#1e293b');
                let hx = 40;
                cols.forEach(c => {
                    drawCell(c.label.toUpperCase(), hx, y, c.w, headerHeight, {
                        color: '#ffffff', fontSize: 7.5, bold: true,
                    });
                    hx += c.w;
                });
                y += headerHeight;
            }

            const bg = i % 2 === 1 ? '#f8fafc' : '#ffffff';
            doc.rect(40, y, pageWidth, rowHeight).fill(bg);

            const nominal = r.refund_nominal
                ? 'Rp ' + parseInt(r.refund_nominal).toLocaleString('id-ID')
                : '-';

            const rowData = {
                no:          i + 1,
                regno:       r.regno || '-',
                name:        r.name || '-',
                dept:        String(r.Departemen || r.department_name || r.department_id || '-'),
                refund_type: r.refund_type || '-',
                nominal,
                tglAjuan:    r.requested_at ? new Date(r.requested_at).toLocaleDateString('id-ID') : '-',
                catatan:     r.approval_reason || '-',
                tglVerif:    r.verified_at ? new Date(r.verified_at).toLocaleDateString('id-ID') : '-',
            };

            let rx = 40;
            cols.forEach(c => {
                const align = c.key === 'nominal' ? 'right' : 'left';
                drawCell(rowData[c.key], rx, y, c.w, rowHeight, {
                    color: '#1e293b', fontSize: 8, align,
                });
                rx += c.w;
            });

            drawRowBorder(y, rowHeight);
            y += rowHeight;
        });
    }

    // ── Footer ───────────────────────────────────────────────────
    doc.moveTo(40, y + 10).lineTo(40 + pageWidth, y + 10).stroke('#e2e8f0');
    doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
       .text(
           `Total: ${data.length} mahasiswa — Dokumen ini digenerate secara otomatis oleh Sistem.`,
           40, y + 14,
       );

    doc.end();
};