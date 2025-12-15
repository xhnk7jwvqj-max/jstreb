import { test, expect } from '@playwright/test';

test.describe('Objective Landscape Plotting', () => {
  test('should run optimizer on whipper and plot objective landscape', async ({ page }) => {
    // Set timeout to 3 minutes since optimization and plotting take time
    test.setTimeout(180000);
    await page.goto('/');

    // Wait for the application to load
    await page.waitForTimeout(1000);

    // Load the "Whipper" preset
    await page.selectOption('#presets', 'Whipper');
    await page.waitForTimeout(1000);

    console.log('Loaded Whipper preset');

    // Get initial range value
    const initialRangeText = await page.locator('#range').textContent();
    const initialRange = parseFloat(initialRangeText);
    console.log(`Initial range: ${initialRange.toFixed(1)} ft`);

    // Click the optimize button to start optimization
    const optimizeButton = page.locator('#optimize');
    await expect(optimizeButton).toBeVisible();
    await optimizeButton.click();

    console.log('Started optimization...');

    // Wait for optimization to run for 15 seconds to build up covariance
    await page.waitForTimeout(15000);

    // Stop optimization
    await optimizeButton.click();

    // Get final range value
    const finalRangeText = await page.locator('#range').textContent();
    const finalRange = parseFloat(finalRangeText);
    console.log(`Final range after optimization: ${finalRange.toFixed(1)} ft`);

    // Verify that optimization improved range
    expect(finalRange).toBeGreaterThan(initialRange);

    // Now click the Plot Landscape button
    const plotButton = page.locator('#plotLandscape');
    await expect(plotButton).toBeVisible();

    console.log('Generating objective landscape plot...');
    await plotButton.click();

    // Wait for plot container to become visible
    const plotContainer = page.locator('#plotContainer');
    await expect(plotContainer).toBeVisible({ timeout: 60000 });

    // Wait for canvas to be visible
    const canvas = page.locator('#myChart');
    await expect(canvas).toBeVisible();

    // Wait a bit more for computation to complete
    console.log('Waiting for landscape computation to complete...');
    await page.waitForTimeout(30000);

    console.log('Plot should be generated, attempting to extract data...');

    // Try to extract the landscape plot data
    const landscapeData = await page.evaluate(() => {
      return window.landscapePlotData || null;
    });

    // Save data to JSON file for external plotting
    const fs = require('fs');
    if (landscapeData) {
      fs.writeFileSync('landscape-data.json', JSON.stringify(landscapeData, null, 2));
      console.log('Landscape data saved to landscape-data.json');
      console.log(`Data dimensions: ${landscapeData.objectiveValues.length} points`);
      console.log(`Eigenvalues: ${landscapeData.eigenvalues}`);
    } else {
      console.log('Warning: landscapeData is undefined, trying to extract partial data');
      // Try to get console logs from the page
      const logs = await page.evaluate(() => {
        return document.body.innerText;
      });
      fs.writeFileSync('page-debug.txt', logs);
    }

    // Scroll to the plot container
    await plotContainer.scrollIntoViewIfNeeded();

    // Take a screenshot of just the plot container
    await plotContainer.screenshot({
      path: 'landscape-plot-chart-only.png'
    });

    console.log('Screenshot of chart saved to landscape-plot-chart-only.png');

    // Also take a full page screenshot
    await page.screenshot({
      path: 'landscape-plot.png',
      fullPage: true
    });

    console.log('Full page screenshot saved to landscape-plot.png');

    // Keep the page open for a bit to allow inspection
    await page.waitForTimeout(3000);
  });
});
