import { test, expect } from '@playwright/test';

test.describe('Collection Tracker E2E', () => {
  test('loads home page and filters cards by search query', async ({ page }) => {
    await page.goto('/');

    // Check header brand
    await expect(page.locator('header').getByText('Talingchan Count')).toBeVisible();

    // Type in search box
    const searchInput = page.locator('input[placeholder*="ค้นหาชื่อการ์ด"]');
    await searchInput.fill('นนทก');

    // นนทก นิ้วเพชร should be visible
    await expect(page.getByText('นนทก นิ้วเพชร').first()).toBeVisible();
    await expect(page.getByText('BT01-001').first()).toBeVisible();

    // Click on the card to open CardDetailModal
    await page.getByText('นนทก นิ้วเพชร').first().click();

    // Verify modal content
    await expect(page.getByText('ความสามารถการ์ด (Effect):')).toBeVisible();
    await expect(page.getByText('เมื่อการ์ดใบนี้สั่งโจมตี Avatar เทพ')).toBeVisible();

    // Press Escape to close modal
    await page.keyboard.press('Escape');
    await expect(page.getByText('ความสามารถการ์ด (Effect):')).not.toBeVisible();
  });
});
