const { test, expect } = require('@playwright/test');
const { getConnection } = require('../lib/db');

test.describe('Uji Coba Validasi Persetujuan Admin', () => {

  test.beforeEach(async () => {
    const db = await getConnection();
    await db.query('DELETE FROM student_request_refund_approvals WHERE student_request_refund_id = 2');
    await db.query('UPDATE student_requests SET status = 0 WHERE id = 2');
  });

  test('Alur Validasi Admin: Setuju, Batal (Update), Tolak, Blokir saat Ditolak/Disetujui WD2', async ({ page, request }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    await page.goto('http://localhost:3000/login');
    await page.getByLabel('Email').fill('admin@unand.ac.id');
    await page.getByLabel('Password').fill('Admin@123');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).not.toHaveURL(/.*login/);

    await page.goto('http://localhost:3000/ukt/permohonan/2');
    
    const statusBanner = page.locator('.status-banner');
    await expect(statusBanner).toContainText('Menunggu Verifikasi Admin');

    await page.getByRole('button', { name: 'Setujui' }).click();
    await page.locator('#inp-nominal').fill('2800000');
    await page.locator('#inp-catatan').fill('Data sesuai, disetujui admin.');
    await page.locator('#btn-konfirmasi').click();

    await expect(statusBanner).not.toContainText('Menunggu Verifikasi Admin');
    await expect(statusBanner).toContainText('Disetujui Admin (Tahap 1)');
    await expect(page.getByRole('button', { name: 'Batalkan Verifikasi' })).toBeVisible();

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Batalkan Verifikasi' }).click();

    await expect(statusBanner).not.toContainText('Disetujui Admin (Tahap 1)');
    await expect(statusBanner).toContainText('Menunggu Verifikasi Admin');
    await expect(page.getByRole('button', { name: 'Setujui' })).toBeVisible();

    await page.getByRole('button', { name: 'Tolak' }).click();
    await page.locator('#inp-catatan').fill('Ditolak karena tidak sesuai ketentuan.');
    await page.locator('#btn-konfirmasi').click();

    await expect(statusBanner).not.toContainText('Menunggu Verifikasi Admin');
    await expect(statusBanner).toContainText('Ditolak Admin');

    const context = page.context();
    const cookies = await context.cookies();
    const sessionCookieObj = cookies.find(c => c.name === 'session_cookie_name' || c.name === 'connect.sid');
    const cookieHeaderVal = sessionCookieObj ? `${sessionCookieObj.name}=${sessionCookieObj.value}` : '';

    const directApproveRes = await request.post('http://localhost:3000/api/admin/permohonan/2/verifikasi', {
      headers: {
        'Cookie': cookieHeaderVal
      },
      data: {
        status_verifikasi: '1',
        catatan: 'Coba paksa setujui',
        nominal: '2800000'
      }
    });

    expect(directApproveRes.status()).toBe(400);
    const errBody = await directApproveRes.json();
    expect(errBody.success).toBe(false);
    expect(errBody.message).toContain('Permohonan yang sudah ditolak tidak dapat disetujui');

    const tooLongCatatanRes = await request.post('http://localhost:3000/api/admin/permohonan/2/verifikasi', {
      headers: {
        'Cookie': cookieHeaderVal
      },
      data: {
        status_verifikasi: '1',
        catatan: 'A'.repeat(46),
        nominal: '2800000'
      }
    });
    expect(tooLongCatatanRes.status()).toBe(400);
    const errBodyLong = await tooLongCatatanRes.json();
    expect(errBodyLong.success).toBe(false);
    expect(errBodyLong.message).toContain('Catatan tidak boleh lebih dari 45 karakter');

    await page.goto('http://localhost:3000/logout');
    
    await page.goto('http://localhost:3000/login');
    await page.getByLabel('Email').fill('wd2@unand.ac.id');
    await page.getByLabel('Password').fill('Wd2@12345');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/.*wd2/);

    await page.locator(`button[onclick*="openReviewModal('2', 'setuju')"]`).click();
    await page.locator('#modalCatatan').fill('Disetujui final oleh Wakil Dekan 2.');
    await page.locator('#btnModalSubmit').click();
    
    await page.waitForTimeout(1000);
    await expect(page.locator('tbody#tbodyWD2')).toContainText('Selesai (Disetujui)');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Data SK Rektorat (JSON)' }).click()
    ]);
    const fs = require('fs');
    const downloadPath = await download.path();
    const jsonContent = JSON.parse(fs.readFileSync(downloadPath, 'utf8'));
    expect(jsonContent.success).toBe(true);
    expect(jsonContent.data.length).toBeGreaterThan(0);
    await page.goto('http://localhost:3000/logout');
    await page.goto('http://localhost:3000/login');
    await page.getByLabel('Email').fill('admin@unand.ac.id');
    await page.getByLabel('Password').fill('Admin@123');
    await page.getByRole('button', { name: 'Login' }).click();

    await page.goto('http://localhost:3000/ukt/permohonan/2');

    await expect(statusBanner).toContainText('Disetujui Wakil Dekan 2 (Selesai)');
    await expect(page.getByRole('button', { name: 'Batalkan Verifikasi' })).not.toBeVisible();

    const adminCookies = await context.cookies();
    const newSessionCookieObj = adminCookies.find(c => c.name === 'session_cookie_name' || c.name === 'connect.sid');
    const newCookieHeaderVal = newSessionCookieObj ? `${newSessionCookieObj.name}=${newSessionCookieObj.value}` : '';

    const directDeleteRes = await request.delete('http://localhost:3000/api/admin/permohonan/2/verifikasi', {
      headers: {
        'Cookie': newCookieHeaderVal
      }
    });

    expect(directDeleteRes.status()).toBe(400);
    const deleteErrBody = await directDeleteRes.json();
    expect(deleteErrBody.success).toBe(false);
    expect(deleteErrBody.message).toContain('Wakil Dekan 2');
  });

});
