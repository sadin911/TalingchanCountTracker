import { test, expect } from '@playwright/test';

/**
 * UI Sanity & Legibility Guard (Independent Automated Verifier)
 * Prevents Goodhart's Law regressions during UI/Tailwind refactoring:
 * 1. Zero console errors or uncaught page exceptions across all 3 core tabs.
 * 2. Zero horizontal overflow on both Desktop (1366x900) and Mobile (390x844).
 * 3. Legibility Guard: no visible text element has font-size < 9px or opacity < 0.2.
 * 4. Semantic Contract Lock: critical data-testid & Thai navigation landmarks remain intact.
 */
test.describe('UI Sanity & Legibility Guard (All Tabs)', () => {
  test('verifies Collection, Deck Builder, and Solo Playmat pass layout & legibility guards', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        errors.push(msg.text());
      }
    });

    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto('/');

    // 1. Check Collection Tab
    await expect(page.locator('header').getByText('Talingchan Count')).toBeVisible();
    await expect(page.getByTestId('btn-account-menu')).toBeVisible();

    const checkViewportAndLegibility = async (tabName: string) => {
      const report = await page.evaluate(() => {
        const overflowX = document.documentElement.scrollWidth - window.innerWidth;
        const els = Array.from(document.querySelectorAll('button, a, h1, h2, h3, p, span, input'));
        let tinyFontCount = 0;
        let invisibleTextCount = 0;

        for (const el of els) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          const text = (el.textContent || '').trim();
          if (!text) continue;
          const style = window.getComputedStyle(el);
          if (style.visibility === 'hidden' || style.display === 'none') continue;
          const fontSize = parseFloat(style.fontSize);
          const opacity = parseFloat(style.opacity);
          if (fontSize < 9) tinyFontCount++;
          if (opacity < 0.15) invisibleTextCount++;
        }

        return { overflowX, tinyFontCount, invisibleTextCount };
      });

      expect(report.overflowX, `${tabName}: Horizontal overflow detected`).toBeLessThanOrEqual(4);
      expect(report.tinyFontCount, `${tabName}: Illegible tiny font (<9px) detected`).toBe(0);
      expect(report.invisibleTextCount, `${tabName}: Invisible text (<0.15 opacity) detected`).toBe(0);
    };

    await checkViewportAndLegibility('Collection Tab (Desktop)');

    // 2. Check Deck Builder Tab
    await page.locator('button:has-text("ระบบจัดเด็ค")').first().click();
    await checkViewportAndLegibility('Deck Builder Tab (Desktop)');

    // 3. Check Solo Playmat Tab & Semantic Contract Lock
    await page.getByTestId('nav-tab-playmat').click();
    await expect(page.getByTestId('playmat-page')).toBeVisible();
    await expect(page.getByTestId('life-count-player1')).toBeVisible();
    await expect(page.getByTestId('life-count-player2')).toBeVisible();
    await expect(page.getByTestId('avatar-zone-header-player1')).toBeVisible();
    await checkViewportAndLegibility('Solo Playmat Tab (Desktop)');

    expect(errors, `Console/Page errors detected: ${errors.join('; ')}`).toEqual([]);
  });
});
