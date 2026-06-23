const { test, expect } = require('@playwright/test');

test('Uji Coba Alur Penuh - Sistem UKT', async ({ page }) => {
  
  // ==========================================
  // 1. PROSES LOGIN
  // ==========================================
  await page.goto('http://localhost:3000/login');

  // Mengisi form login (Silakan sesuaikan email & password dengan database lokalmu)
  // Menggunakan atribut tipe input karena label berupa teks biasa
  await page.getByLabel('Email').fill('mahasiswa@student.unand.ac.id'); 
await page.getByLabel('Password').fill('password');
  
  // Klik tombol Login
  await page.getByRole('button', { name: 'Login' }).click();

  // Memastikan halaman berhasil berpindah dari halaman login
  await expect(page).not.toHaveURL(/.*login/);


  // ==========================================
  // 2. NAVIGASI KE FORMULIR PENGAJUAN
  // ==========================================
  // Klik menu "Formulir Pengajuan" di sidebar kiri untuk memastikan halaman aktif
  await page.getByRole('link', { name: 'Formulir Pengajuan' }).click();


  // ==========================================
  // 3. MENGISI DATA FORMULIR MAHASISWA
  // ==========================================
  
  // Mengisi Simulasi ID Mahasiswa
  await page.getByPlaceholder('Contoh: 14, 15, 16').fill('1');

  // Mengisi Nama Lengkap
  await page.getByPlaceholder('Masukkan nama lengkap sesuai KTM').fill('Budi Santoso');

  // Mengisi NIM
  await page.getByPlaceholder('Contoh: 1234567890').fill('1234567890');

  // Memilih Departemen (Radio Button) - Contoh: memilih 'Teknik Komputer'
  await page.locator('label', { hasText: 'Teknik Komputer' }).click();


  // ==========================================
  // 4. UPLOAD BERKAS PENDUKUNG (Otomatis tanpa file fisik)
  // ==========================================
  // Membuat file dummy otomatis agar skrip langsung bisa mendeteksi upload berkas (.pdf)
  const dummyPdf = {
    name: 'dokumen_test.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('fake pdf content data'),
  };

  // Upload Berkas 1: Surat Permohonan (input file urutan pertama)
  await page.locator('input[type="file"]').nth(0).setInputFiles(dummyPdf);

  // Upload Berkas 2: Bukti Pembayaran UKT (input file urutan kedua)
  await page.locator('input[type="file"]').nth(1).setInputFiles(dummyPdf);

  // Upload Berkas 3: SK Rektor / Bukti Cuti (input file urutan ketiga)
  await page.locator('input[type="file"]').nth(2).setInputFiles(dummyPdf);


  // ==========================================
  // 5. MENGISI NO WHATSAPP & KIRIM FORM
  // ==========================================
  
  // Mengisi No. WhatsApp Aktif
  await page.getByPlaceholder('Contoh: 08123456789').fill('081234567890');

  // Klik tombol "Kirim Permohonan"
  await page.getByRole('button', { name: 'Kirim Permohonan' }).click();


  // ==========================================
  // 6. MEMBUKA RIWAYAT PENGAJUAN (Pojok Kanan Bawah)
  // ==========================================
  // Memberikan toleransi waktu tunggu 1 detik agar proses submit selesai
 await page.getByRole('button', { name: 'Riwayat Pengajuan' }).click({ force: true });

// Pastikan modalnya muncul setelah dipaksa klik
await expect(page.locator('#modalRiwayat')).toBeVisible();
});