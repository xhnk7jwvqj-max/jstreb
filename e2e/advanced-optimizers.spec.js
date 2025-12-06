import { test, expect } from '@playwright/test';

test.describe('Advanced Optimizers', () => {
  test('should display advanced optimizer UI elements', async ({ page }) => {
    await page.goto('/');

    // Check that optimizer dropdown exists and is visible
    await expect(page.locator('#optimizerSelect')).toBeVisible();

    // Check that advanced optimize button exists and is visible
    await expect(page.getByRole('button', { name: 'Optimize (Advanced)' })).toBeVisible();

    // Verify all optimizer options are available
    const dropdown = page.locator('#optimizerSelect');
    const options = await dropdown.locator('option').allTextContents();

    expect(options).toContain('Select Advanced Optimizer');
    expect(options).toContain('Improved CMA-ES');
    expect(options).toContain('Differential Evolution');
    expect(options).toContain('Particle Swarm');
    expect(options).toContain('Simulated Annealing');
    expect(options).toContain('Nelder-Mead Simplex');
    expect(options).toContain('Adaptive Momentum');
  });

  test('should alert when no optimizer is selected', async ({ page }) => {
    await page.goto('/');

    // Set up dialog handler
    page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('Please select an optimizer');
      await dialog.accept();
    });

    // Click button without selecting optimizer
    const optimizeButton = page.locator('#optimizeAdvanced');
    await optimizeButton.click();

    // Wait a bit for dialog to appear
    await page.waitForTimeout(500);
  });

  test('should run Improved CMA-ES optimizer', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Get initial range value
    const initialRangeText = await page.locator('#range').textContent();
    const initialRange = parseFloat(initialRangeText);

    console.log(`Initial range for CMA-ES: ${initialRange.toFixed(1)} ft`);

    // Select Improved CMA-ES optimizer
    await page.locator('#optimizerSelect').selectOption('improved-cmaes');

    // Get the optimize button
    const optimizeButton = page.locator('#optimizeAdvanced');
    await expect(optimizeButton).toHaveText('Optimize (Advanced)');

    // Click to start optimization
    await optimizeButton.click();

    // Verify button text changes to "Stop"
    await expect(optimizeButton).toHaveText('Stop');

    // Wait for optimization to run
    await page.waitForTimeout(8000);

    // Click to stop optimization
    await optimizeButton.click();

    // Verify button text changes back
    await expect(optimizeButton).toHaveText('Optimize (Advanced)');

    // Get final range value
    const finalRangeText = await page.locator('#range').textContent();
    const finalRange = parseFloat(finalRangeText);

    console.log(`Final range for CMA-ES: ${finalRange.toFixed(1)} ft`);

    // Verify that optimization improved the range
    expect(finalRange).toBeGreaterThan(initialRange);
  });

  test('should run Differential Evolution optimizer', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Get initial range value
    const initialRangeText = await page.locator('#range').textContent();
    const initialRange = parseFloat(initialRangeText);

    console.log(`Initial range for DE: ${initialRange.toFixed(1)} ft`);

    // Select Differential Evolution optimizer
    await page.locator('#optimizerSelect').selectOption('differential-evolution');

    // Get the optimize button
    const optimizeButton = page.locator('#optimizeAdvanced');

    // Click to start optimization
    await optimizeButton.click();
    await expect(optimizeButton).toHaveText('Stop');

    // Wait for optimization to run
    await page.waitForTimeout(8000);

    // Click to stop optimization
    await optimizeButton.click();
    await expect(optimizeButton).toHaveText('Optimize (Advanced)');

    // Get final range value
    const finalRangeText = await page.locator('#range').textContent();
    const finalRange = parseFloat(finalRangeText);

    console.log(`Final range for DE: ${finalRange.toFixed(1)} ft`);

    // Verify that optimization improved the range
    expect(finalRange).toBeGreaterThan(initialRange);
  });

  test('should run Particle Swarm optimizer', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Get initial range value
    const initialRangeText = await page.locator('#range').textContent();
    const initialRange = parseFloat(initialRangeText);

    console.log(`Initial range for PSO: ${initialRange.toFixed(1)} ft`);

    // Select Particle Swarm optimizer
    await page.locator('#optimizerSelect').selectOption('particle-swarm');

    // Get the optimize button
    const optimizeButton = page.locator('#optimizeAdvanced');

    // Click to start optimization
    await optimizeButton.click();
    await expect(optimizeButton).toHaveText('Stop');

    // Wait for optimization to run
    await page.waitForTimeout(8000);

    // Click to stop optimization
    await optimizeButton.click();
    await expect(optimizeButton).toHaveText('Optimize (Advanced)');

    // Get final range value
    const finalRangeText = await page.locator('#range').textContent();
    const finalRange = parseFloat(finalRangeText);

    console.log(`Final range for PSO: ${finalRange.toFixed(1)} ft`);

    // Verify that optimization improved the range
    expect(finalRange).toBeGreaterThan(initialRange);
  });

  test('should run Simulated Annealing optimizer', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Get initial range value
    const initialRangeText = await page.locator('#range').textContent();
    const initialRange = parseFloat(initialRangeText);

    console.log(`Initial range for SA: ${initialRange.toFixed(1)} ft`);

    // Select Simulated Annealing optimizer
    await page.locator('#optimizerSelect').selectOption('simulated-annealing');

    // Get the optimize button
    const optimizeButton = page.locator('#optimizeAdvanced');

    // Click to start optimization
    await optimizeButton.click();
    await expect(optimizeButton).toHaveText('Stop');

    // Wait for optimization to run
    await page.waitForTimeout(8000);

    // Click to stop optimization
    await optimizeButton.click();
    await expect(optimizeButton).toHaveText('Optimize (Advanced)');

    // Get final range value
    const finalRangeText = await page.locator('#range').textContent();
    const finalRange = parseFloat(finalRangeText);

    console.log(`Final range for SA: ${finalRange.toFixed(1)} ft`);

    // Verify that optimization improved the range
    expect(finalRange).toBeGreaterThan(initialRange);
  });

  test('should run Nelder-Mead optimizer', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Get initial range value
    const initialRangeText = await page.locator('#range').textContent();
    const initialRange = parseFloat(initialRangeText);

    console.log(`Initial range for Nelder-Mead: ${initialRange.toFixed(1)} ft`);

    // Select Nelder-Mead optimizer
    await page.locator('#optimizerSelect').selectOption('nelder-mead');

    // Get the optimize button
    const optimizeButton = page.locator('#optimizeAdvanced');

    // Click to start optimization
    await optimizeButton.click();
    await expect(optimizeButton).toHaveText('Stop');

    // Wait for optimization to run
    await page.waitForTimeout(8000);

    // Click to stop optimization
    await optimizeButton.click();
    await expect(optimizeButton).toHaveText('Optimize (Advanced)');

    // Get final range value
    const finalRangeText = await page.locator('#range').textContent();
    const finalRange = parseFloat(finalRangeText);

    console.log(`Final range for Nelder-Mead: ${finalRange.toFixed(1)} ft`);

    // Verify that optimization improved the range
    expect(finalRange).toBeGreaterThan(initialRange);
  });

  test('should run Adaptive Momentum optimizer', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Get initial range value
    const initialRangeText = await page.locator('#range').textContent();
    const initialRange = parseFloat(initialRangeText);

    console.log(`Initial range for Adaptive Momentum: ${initialRange.toFixed(1)} ft`);

    // Select Adaptive Momentum optimizer
    await page.locator('#optimizerSelect').selectOption('adaptive-momentum');

    // Get the optimize button
    const optimizeButton = page.locator('#optimizeAdvanced');

    // Click to start optimization
    await optimizeButton.click();
    await expect(optimizeButton).toHaveText('Stop');

    // Wait for optimization to run
    await page.waitForTimeout(8000);

    // Click to stop optimization
    await optimizeButton.click();
    await expect(optimizeButton).toHaveText('Optimize (Advanced)');

    // Get final range value
    const finalRangeText = await page.locator('#range').textContent();
    const finalRange = parseFloat(finalRangeText);

    console.log(`Final range for Adaptive Momentum: ${finalRange.toFixed(1)} ft`);

    // Verify that optimization improved the range
    expect(finalRange).toBeGreaterThan(initialRange);
  });

  test('should be able to stop optimizer mid-run', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Select any optimizer
    await page.locator('#optimizerSelect').selectOption('particle-swarm');

    // Get the optimize button
    const optimizeButton = page.locator('#optimizeAdvanced');

    // Start optimization
    await optimizeButton.click();
    await expect(optimizeButton).toHaveText('Stop');

    // Wait only 2 seconds instead of full duration
    await page.waitForTimeout(2000);

    // Stop optimization early
    await optimizeButton.click();
    await expect(optimizeButton).toHaveText('Optimize (Advanced)');

    // Verify we can start again
    await optimizeButton.click();
    await expect(optimizeButton).toHaveText('Stop');

    // Stop again
    await optimizeButton.click();
    await expect(optimizeButton).toHaveText('Optimize (Advanced)');
  });

  test.skip('should compare all optimizers performance', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const results = {};
    const optimizers = [
      'improved-cmaes',
      'differential-evolution',
      'particle-swarm',
      'simulated-annealing',
      'nelder-mead',
      'adaptive-momentum'
    ];

    for (const optimizer of optimizers) {
      // Reload to reset to initial state
      await page.goto('/');
      await page.waitForTimeout(1000);

      // Get initial range
      const initialRangeText = await page.locator('#range').textContent();
      const initialRange = parseFloat(initialRangeText);

      // Select optimizer
      await page.locator('#optimizerSelect').selectOption(optimizer);

      // Run optimization
      const optimizeButton = page.locator('#optimizeAdvanced');
      await optimizeButton.click();
      await page.waitForTimeout(10000); // 10 seconds per optimizer
      await optimizeButton.click();

      // Get final range
      const finalRangeText = await page.locator('#range').textContent();
      const finalRange = parseFloat(finalRangeText);

      results[optimizer] = {
        initial: initialRange,
        final: finalRange,
        improvement: finalRange - initialRange
      };

      console.log(`${optimizer}: ${initialRange.toFixed(1)} → ${finalRange.toFixed(1)} ft (${results[optimizer].improvement.toFixed(1)} ft improvement)`);
    }

    // Log summary
    console.log('\n=== Optimizer Performance Summary ===');
    const sorted = Object.entries(results).sort((a, b) => b[1].final - a[1].final);
    sorted.forEach(([name, data], index) => {
      console.log(`${index + 1}. ${name}: ${data.final.toFixed(1)} ft`);
    });
  });
});
