import { test, expect } from '@playwright/test';

test.describe('Trebuchet Designer', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');

    // Check that the title is correct
    await expect(page).toHaveTitle('Trebuchet Designer');

    // Verify main UI elements are visible
    await expect(page.locator('#app')).toBeVisible();
    await expect(page.locator('#mechanism')).toBeVisible();
  });

  test('should display control buttons', async ({ page }) => {
    await page.goto('/');

    // Check that all main control buttons are present
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Optimize' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gentlify' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Load' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test('should display particle and constraint controls', async ({ page }) => {
    await page.goto('/');

    // Check particle controls
    await expect(page.getByRole('button', { name: '+ Particle' })).toBeVisible();

    // Check constraint controls
    await expect(page.getByRole('button', { name: '+ Rod' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Slider' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Roller' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Rope' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Pin' })).toBeVisible();
  });

  test('should have presets dropdown', async ({ page }) => {
    await page.goto('/');

    // Check that presets dropdown exists
    await expect(page.locator('#presets')).toBeVisible();
  });

  test('should display range and simulation metrics', async ({ page }) => {
    await page.goto('/');

    // Check that metrics are displayed
    await expect(page.locator('#range')).toBeVisible();
    await expect(page.locator('#peakLoad')).toBeVisible();
    await expect(page.locator('#simtime')).toBeVisible();
  });
});
