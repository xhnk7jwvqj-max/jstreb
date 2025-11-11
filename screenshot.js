import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

async function takeScreenshot() {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

  // Wait a bit for any animations/rendering
  await new Promise(resolve => setTimeout(resolve, 2000));

  await page.screenshot({ path: 'website-screenshot.png', fullPage: true });

  await browser.close();
  console.log('Screenshot saved as website-screenshot.png');
}

takeScreenshot().catch(console.error);
