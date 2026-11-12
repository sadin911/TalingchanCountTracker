import { test, expect } from '@playwright/test';

test.describe('Solo Practice Playmat & Account Menu E2E', () => {
  test('opens AccountMenu and displays Google Login and JSON Backup options', async ({ page }) => {
    await page.goto('/');

    const accountBtn = page.getByTestId('btn-account-menu');
    await expect(accountBtn).toBeVisible();
    await accountBtn.click();

    await expect(page.getByTestId('account-menu-dropdown')).toBeVisible();
    await expect(page.getByTestId('btn-google-sign-in')).toBeVisible();

    await page.getByTestId('btn-open-collection-backup').click();
    await expect(page.getByTestId('collection-backup-modal')).toBeVisible();
  });

  test('opens MCP Server modal and generates a scoped Personal Access Token', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('btn-account-menu').click();
    await expect(page.getByTestId('btn-open-mcp-modal')).toBeVisible();
    await page.getByTestId('btn-open-mcp-modal').click();

    await expect(page.getByTestId('mcp-server-modal')).toBeVisible();
    await expect(page.getByTestId('mcp-config-snippet')).toContainText('/mcp');

    await page.getByTestId('btn-generate-mcp-token').click();
    await expect(page.getByTestId('mcp-new-token-box')).toBeVisible();
    await expect(page.getByTestId('mcp-new-token-box')).toContainText('tct_mcp_');
  });

  test('runs Dual-Side Solo Playmat: expandable Avatar Zone, Cost payment to Hell Zone, Combat, and P1/P2 hand switch', async ({
    page,
  }) => {
    await page.goto('/');

    // Navigate to Solo Playmat tab
    await page.getByTestId('nav-tab-playmat').click();
    await expect(page.getByTestId('playmat-page')).toBeVisible();

    // Verify P1 and P2 boards are initialized with 5 Life cards and 4 Avatar slots
    await expect(page.getByTestId('life-count-player1')).toContainText('5/5');
    await expect(page.getByTestId('life-count-player2')).toContainText('5/5');
    await expect(page.getByTestId('avatar-zone-header-player1')).toContainText('0/4 ช่อง');

    // Expand P1 Avatar Zone from 4 to 5 slots
    await page.getByTestId('btn-expand-avatar-zone-player1').click();
    await expect(page.getByTestId('avatar-zone-header-player1')).toContainText('0/5 ช่อง');
    await expect(page.getByTestId('avatar-slot-player1-4')).toBeVisible();

    // Summon a card from P1 Hand into Avatar Zone while paying 1 Cost card to Hell Zone
    const firstHandCard = page.locator('[data-testid^="hand-card-player1-main-"]').first();
    await expect(firstHandCard).toBeVisible();
    await firstHandCard.click();

    await expect(page.getByTestId('cost-payment-modal')).toBeVisible();
    const firstCostOption = page.locator('[data-testid^="cost-card-"]').first();
    await firstCostOption.click();

    await page.getByTestId('btn-confirm-summon-avatar').click();

    // Verify P1 Avatar Slot #0 is occupied and P1 Hell Zone has 1 card
    await expect(page.getByTestId('avatar-zone-header-player1')).toContainText('1/5 ช่อง');
    await expect(page.getByTestId('btn-hell-zone-player1')).toContainText('นรก (1)');

    // Click summoned Avatar on field to open CombatTargetModal, buff POWER +1, and destroy P2 Life Card #1
    await page.getByTestId('avatar-slot-player1-0').click();
    await expect(page.getByTestId('combat-target-modal')).toBeVisible();
    await page.getByTestId('btn-power-delta-1').click();
    await page.getByTestId('btn-attack-life-destroy-0').click();

    // P2 Life count should now be 4/5 and P2 Hell Zone has 1 card
    await expect(page.getByTestId('life-count-player2')).toContainText('4/5');
    await expect(page.getByTestId('btn-hell-zone-player2')).toContainText('นรก (1)');

    // Toggle Reveal Both Hands and switch perspective to P2
    await page.getByTestId('btn-toggle-reveal-hands').click();
    await expect(page.getByTestId('revealed-opponent-hand')).toBeVisible();

    await page.getByTestId('btn-perspective-p2').click();
    await expect(page.getByTestId('active-hand-tray')).toContainText('Player 2');

    // Direct 1-click board slot placement: select a P2 hand card and click P2's Avatar Slot #0 directly
    const firstP2HandCard = page.locator('[data-testid^="hand-card-player2-main-"]').first();
    await firstP2HandCard.click();
    await page.getByTestId('avatar-slot-player2-0').click();
    await expect(page.getByTestId('avatar-zone-header-player2')).toContainText('1/4 ช่อง');

    // Place a P2 hand card into P2's Gem Zone and flush Gem Zone to Hell Zone
    const secondP2HandCard = page.locator('[data-testid^="hand-card-player2-main-"]').first();
    await secondP2HandCard.click();
    await page.getByTestId('gem-zone-player2').click();
    await expect(page.getByTestId('gem-zone-player2')).toContainText('ช่อง GEM (1 ใบ)');
    await page.getByTestId('btn-flush-gem-player2').click();
    await expect(page.getByTestId('gem-zone-player2')).toContainText('ช่อง GEM (0 ใบ)');
  });
});

