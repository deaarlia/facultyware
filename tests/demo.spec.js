const { test, expect } = require('@playwright/test');

test('Uji Coba Navigasi dan Klik di Playwright', async ({ page }) => {
  // 1. Buka URL target
  await page.goto('http://localhost:3000/');

  // Lakukan interaksi seperti biasa
  await page.getByRole('button', { name: 'Login' }).click();
});