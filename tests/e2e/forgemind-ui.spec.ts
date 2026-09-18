import { test, expect } from '@playwright/test';

test.describe('ForgeMind UI/UX Verification Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Landing & Navigation: Header, theme palette, and segmented mode switcher', async ({ page }) => {
    // 1. Verify header displays "ForgeMind" and the "DE-TUTORIALIZER" badge
    const header = page.locator('header');
    await expect(header).toBeVisible();
    await expect(header).toContainText('ForgeMind');
    await expect(header).toContainText('THE PM DE-TUTORIALIZER');

    // 2. Verify background conforms to light canvas and no dark-theme classes
    const body = page.locator('body');
    await expect(body).not.toHaveClass(/dark:bg-slate-900/);
    const mainContainer = page.locator('#home-page');
    await expect(mainContainer).toBeVisible();

    // 3. Verify segmented toggle: "Bring Your Material" is first & active by default, switches to "Curated Library"
    const customTabBtn = page.locator('#tab-btn-custom');
    const libraryTabBtn = page.locator('#tab-btn-library');
    await expect(customTabBtn).toBeVisible();
    await expect(libraryTabBtn).toBeVisible();

    // Initial state shows Bring Your Material panel
    await expect(page.locator('#panel-custom')).toBeVisible();

    // 4. Test all 3 tabs in BYO mode: "Paste Notes", "Upload File", and "YouTube URL"
    await expect(page.getByRole('button', { name: 'Paste Notes' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Upload File/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /YouTube URL/i })).toBeVisible();

    // Switch to Curated Library
    await libraryTabBtn.click();
    await expect(page.locator('#panel-library')).toBeVisible();
  });

  test('Navigation Across Routes: Studio, Track, Evidence Vault, and Profile', async ({ page }) => {
    // Track navigation
    const trackBtn = page.locator('#nav-track-btn');
    await trackBtn.click();
    await expect(page.locator('#track-page')).toBeVisible();
    await expect(page.locator('#track-page')).toContainText('Mastery Progression Track');

    // Evidence Vault navigation
    const evidenceBtn = page.locator('#nav-evidence-btn');
    await evidenceBtn.click();
    await expect(page.locator('#evidence-page')).toBeVisible();
    await expect(page.locator('#evidence-page')).toContainText('Capability Evidence Vault');

    // Profile navigation
    const profileBtn = page.locator('#header-profile-btn');
    await profileBtn.click();
    await expect(page.locator('#profile-page')).toBeVisible();
    await expect(page.locator('#profile-page')).toContainText('Cognitive Rigor & Boundaries');

    // Return to Studio
    const studioBtn = page.locator('#nav-studio-btn');
    await studioBtn.click();
    await expect(page.locator('#home-page')).toBeVisible();
  });

  test('Closed-Book Challenge Canvas: Reference notes unmounted & single memo textarea', async ({ page }) => {
    // Switch to Curated Library in Studio
    await page.locator('#tab-btn-library').click();
    await expect(page.locator('#panel-library')).toBeVisible();

    // Select the first scenario card from the Curated Library
    const conceptCard = page.locator('article.concept-card').first();
    await expect(conceptCard).toBeVisible();
    await conceptCard.click();

    // Wait for pre-flight confidence calibration card to appear, then begin independent attempt
    const beginBtn = page.locator('#begin-attempt-btn');
    await beginBtn.waitFor({ state: 'visible', timeout: 20000 });
    await beginBtn.click();

    // CHALLENGE CANVAS
    // 1. Verify reference notes are completely unmounted from the DOM
    await expect(page.locator('#reference-solution-notes')).toHaveCount(0);

    // 2. Verify there is only ONE single crucible memo textarea
    const memoTextarea = page.locator('#crucible-memo-textarea');
    await expect(memoTextarea).toBeVisible();
    const allTextareas = page.locator('textarea');
    await expect(allTextareas).toHaveCount(1);

    // 3. Verify the Hint Ladder rail is mounted
    const hintLadder = page.locator('#hint-ladder-rail');
    await expect(hintLadder).toBeVisible();
  });

  test('Evaluation Results Card: Submits response and renders strict verdict audit', async ({ page }) => {
    // Switch to Curated Library in Studio
    await page.locator('#tab-btn-library').click();
    await expect(page.locator('#panel-library')).toBeVisible();

    const conceptCard = page.locator('article.concept-card').first();
    await expect(conceptCard).toBeVisible();
    await conceptCard.click();

    const beginBtn = page.locator('#begin-attempt-btn');
    await beginBtn.waitFor({ state: 'visible', timeout: 20000 });
    await beginBtn.click();

    // Fill response memo (> 25 chars)
    const memoTextarea = page.locator('#crucible-memo-textarea');
    await expect(memoTextarea).toBeVisible();
    await memoTextarea.fill(
      'Executive Evaluation: We analyze the lifecycle stages to resolve operational bottlenecks. Quantitative metrics show early customer acquisition needs balancing against retention friction. Recommended action balances phased deployment with minimal regression risks.'
    );

    // Submit attempt
    const submitBtn = page.locator('#submit-attempt-btn');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Verify evaluation results card appears with strict verdict
    const resultsCard = page.locator('#evaluation-results-card');
    await expect(resultsCard).toBeVisible({ timeout: 45000 });
    await expect(resultsCard).toContainText(/CORRECT|PARTIALLY_CORRECT|WRONG_APPROACH|NEEDS_CLARIFICATION/);
  });

  test('Single-Studio Model: In-place category filters and Back to Diagnostic Studio navigation', async ({ page }) => {
    // 1. Switch to Curated Library
    await page.locator('#tab-btn-library').click();
    await expect(page.locator('#panel-library')).toBeVisible();

    // 2. Select category from Track dropdown (e.g., "Product Strategy")
    const categorySelect = page.locator('#category-select');
    await expect(categorySelect).toBeVisible();
    await categorySelect.selectOption('Product Strategy');

    // 3. Click first benchmark card to enter Challenge
    const conceptCard = page.locator('article.concept-card').first();
    await expect(conceptCard).toBeVisible();
    await conceptCard.click();

    // 4. Verify we are in Assessment / Challenge view
    await expect(page.locator('#begin-attempt-btn')).toBeVisible({ timeout: 20000 });

    // 5. Click "Back to Diagnostic Studio"
    const backBtn = page.locator('#back-to-prove-btn');
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // 6. Verify we are back on the homepage / Diagnostic Studio without routing to separate pages
    await expect(page.locator('#home-page')).toBeVisible();
    await expect(page.locator('#panel-library')).toBeVisible();
  });
});
