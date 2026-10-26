import { test, expect } from '@playwright/test';

test.describe('Deck Builder E2E', () => {
  test('creates a deck and checks validation and missing cards', async ({ page }) => {
    await page.goto('/');

    // Switch to Deck Builder Tab
    await page.locator('button:has-text("ระบบจัดเด็ค")').first().click();

    // Check if initial empty state create button is visible
    const initialCreateBtn = page.locator('button:has-text("+ สร้างเด็คแรกทันที")');
    if (await initialCreateBtn.isVisible()) {
      await initialCreateBtn.click();
    } else {
      const newBtn = page.locator('button:has-text("สร้างเด็คใหม่")');
      if (await newBtn.isVisible()) {
        await newBtn.click();
        await page.locator('input[placeholder="ชื่อเด็คใหม่..."]').fill('เด็คทดสอบ');
        await page.locator('button:has-text("สร้าง")').click();
      }
    }

    // Verify Main Deck and LIFE Deck trays appear
    await expect(page.getByText('Main Deck (การ์ดหลัก 50 ใบพอดี)')).toBeVisible();
    await expect(page.getByText('LIFE Deck (การ์ดชีวิต 5 ใบ ไม่ซ้ำกัน)')).toBeVisible();

    // Search an avatar card in the quick adder
    const quickSearch = page.locator('input[placeholder*="พิมพ์ชื่อการ์ด"]');
    await quickSearch.fill('นนทก');

    // Add to Main Deck
    const addMainBtn = page.locator('button:has-text("+Main")').first();
    await expect(addMainBtn).toBeVisible();
    await addMainBtn.click();

    // Verify card appears in Main Deck tray
    await expect(page.getByText('Avatar (ตัวละคร)')).toBeVisible();

    // Add to Life Deck
    const addLifeBtn = page.locator('button:has-text("+Life")').first();
    await addLifeBtn.click();
    await expect(page.getByText('1 / 5 ใบ')).toBeVisible();

    // Open Check Missing Cards Modal
    await page.locator('button:has-text("เช็คการ์ดที่ขาด")').click();
    await expect(page.getByText('เช็คการ์ดที่ขาด (Check Missing Cards)')).toBeVisible();

    // Close modal
    await page.locator('div[role="dialog"] button, div:has-text("เช็คการ์ดที่ขาด") button:has(svg.lucide-x)').first().click();
  });
});
