import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

async function createTestImage() {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 600, height: 400 });

  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <body style="margin:0; display:flex; align-items:center; justify-content:center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height:100vh; font-family: Arial;">
      <div style="text-align:center; color:white;">
        <h1 style="font-size: 60px; margin:0;">✨ Claude Code ✨</h1>
        <p style="font-size: 30px; margin-top:20px;">Image Display Test!</p>
        <p style="font-size: 20px; opacity:0.9;">🎨 🚀 🤖</p>
      </div>
    </body>
    </html>
  `);

  await page.screenshot({ path: 'test-image.png' });
  await browser.close();
  console.log('Test image created!');
}

createTestImage().catch(console.error);
