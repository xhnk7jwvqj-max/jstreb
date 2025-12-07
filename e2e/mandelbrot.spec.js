import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';

test.describe('Mandelbrot Set Visualization', () => {
  let viteServer;
  const port = 5174; // Use a different port than the main app

  test.beforeAll(async () => {
    // Start the vite server for mandeljs
    return new Promise((resolve) => {
      viteServer = spawn('npx', ['vite', '--port', port.toString()], {
        cwd: '/tmp/mandeljs',
        shell: true,
      });

      viteServer.stdout.on('data', (data) => {
        console.log(`Vite: ${data}`);
        if (data.toString().includes('Local:')) {
          // Server is ready
          setTimeout(resolve, 1000); // Give it a second to be fully ready
        }
      });

      viteServer.stderr.on('data', (data) => {
        console.error(`Vite error: ${data}`);
      });
    });
  });

  test.afterAll(async () => {
    if (viteServer) {
      viteServer.kill();
    }
  });

  test('should render the Mandelbrot set', async ({ page }) => {
    // Navigate to the mandeljs app
    await page.goto(`http://localhost:${port}`);

    // Wait for the canvas to be present
    const canvas = page.locator('#canvas');
    await expect(canvas).toBeVisible();

    // Wait a bit for the initial render
    await page.waitForTimeout(2000);

    // Take a screenshot of the Mandelbrot set
    await page.screenshot({
      path: '/home/user/jstreb/mandelbrot-initial.png',
      fullPage: true
    });

    // Check that the canvas has been drawn on (has non-transparent pixels)
    const hasContent = await page.evaluate(() => {
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Check if there are any non-transparent pixels
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) {
          return true;
        }
      }
      return false;
    });

    expect(hasContent).toBe(true);

    // Let's also test zooming in
    // Click somewhere interesting in the Mandelbrot set
    await canvas.click({ position: { x: 500, y: 350 } });

    // Wait for the zoom animation/render
    await page.waitForTimeout(2000);

    // Take another screenshot of the zoomed view
    await page.screenshot({
      path: '/home/user/jstreb/mandelbrot-zoomed.png',
      fullPage: true
    });

    console.log('Screenshots saved to:');
    console.log('  - /home/user/jstreb/mandelbrot-initial.png');
    console.log('  - /home/user/jstreb/mandelbrot-zoomed.png');
  });

  test('should have functional controls', async ({ page }) => {
    await page.goto(`http://localhost:${port}`);

    // Check that controls are present
    await expect(page.locator('#out')).toBeVisible();
    await expect(page.locator('#reset')).toBeVisible();
    await expect(page.locator('#iterations')).toBeVisible();
    await expect(page.locator('#cmapscale')).toBeVisible();

    // Test zoom out button
    await page.click('#out');
    await page.waitForTimeout(1000);

    // Test reset button
    await page.click('#reset');
    await page.waitForTimeout(1000);

    // Test changing iterations
    await page.selectOption('#iterations', '10000');
    await page.waitForTimeout(1000);

    // Take a final screenshot
    await page.screenshot({
      path: '/home/user/jstreb/mandelbrot-controls.png',
      fullPage: true
    });
  });
});
