import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

async function createCapstanDiagram() {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 600 });

  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <body style="margin:0; background: white;">
      <canvas id="canvas" width="800" height="600"></canvas>
      <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');

        // Clear background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 800, 600);

        // Capstan center
        const cx = 400;
        const cy = 300;
        const radius = 80;

        // Draw capstan cylinder
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Rope wrap angle (120 degrees = 2.09 radians)
        const angle1 = -Math.PI / 3;  // -60 degrees
        const angle2 = Math.PI / 3;   // +60 degrees
        const wrapAngle = angle2 - angle1;

        // Entry point (holding side - lower tension)
        const p1x = cx + radius * Math.cos(angle1);
        const p1y = cy + radius * Math.sin(angle1);

        // Exit point (load side - higher tension)
        const p2x = cx + radius * Math.cos(angle2);
        const p2y = cy + radius * Math.sin(angle2);

        // Draw rope wrap on capstan
        ctx.strokeStyle = '#C41E3A';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, angle1, angle2);
        ctx.stroke();

        // Draw rope leading to holding side (thinner = less tension)
        ctx.strokeStyle = '#C41E3A';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.lineTo(p1x - 150, p1y - 50);
        ctx.stroke();

        // Draw rope leading to load side (thicker = more tension)
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(p2x, p2y);
        ctx.lineTo(p2x + 150, p2y - 50);
        ctx.stroke();

        // Draw particles
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(p1x - 150, p1y - 50, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p2x + 150, p2y - 50, 10, 0, Math.PI * 2);
        ctx.fill();

        // Labels
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#000';
        ctx.fillText('P1 (hold)', p1x - 200, p1y - 60);
        ctx.fillText('Capstan', cx - 35, cy + 120);
        ctx.fillText('P2 (load)', p2x + 110, p2y - 60);

        // Draw force arrows
        ctx.strokeStyle = '#0066CC';
        ctx.fillStyle = '#0066CC';
        ctx.lineWidth = 3;

        // Holding force (smaller arrow)
        const holdX = p1x - 150;
        const holdY = p1y - 50;
        ctx.beginPath();
        ctx.moveTo(holdX - 30, holdY);
        ctx.lineTo(holdX - 60, holdY);
        ctx.stroke();
        // Arrow head
        ctx.beginPath();
        ctx.moveTo(holdX - 60, holdY);
        ctx.lineTo(holdX - 50, holdY - 8);
        ctx.lineTo(holdX - 50, holdY + 8);
        ctx.closePath();
        ctx.fill();

        // Load force (larger arrow)
        const loadX = p2x + 150;
        const loadY = p2y - 50;
        ctx.beginPath();
        ctx.moveTo(loadX + 30, loadY);
        ctx.lineTo(loadX + 90, loadY);
        ctx.stroke();
        // Arrow head
        ctx.beginPath();
        ctx.moveTo(loadX + 90, loadY);
        ctx.lineTo(loadX + 80, loadY - 8);
        ctx.lineTo(loadX + 80, loadY + 8);
        ctx.closePath();
        ctx.fill();

        ctx.font = '16px Arial';
        ctx.fillText('T₁', holdX - 80, holdY - 10);
        ctx.fillText('T₂', loadX + 100, loadY - 10);

        // Formula
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#C41E3A';
        ctx.fillText('Capstan Equation:', 50, 50);
        ctx.font = '20px Arial';
        ctx.fillText('T₂ = T₁ × e^(μθ)', 50, 85);

        // Parameters
        ctx.font = '16px Arial';
        ctx.fillStyle = '#333';
        ctx.fillText('θ = ' + (wrapAngle).toFixed(2) + ' rad (' + (wrapAngle * 180 / Math.PI).toFixed(0) + '°)', 50, 115);
        ctx.fillText('μ = 0.3 (friction coefficient)', 50, 140);
        ctx.fillText('Force ratio: T₂/T₁ = ' + Math.exp(0.3 * wrapAngle).toFixed(2), 50, 165);

        // Wrap angle arc indicator
        ctx.strokeStyle = '#FF6B00';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 30, angle1, angle2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Wrap angle label
        ctx.fillStyle = '#FF6B00';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('θ', cx + 50, cy - 80);
      </script>
    </body>
    </html>
  `);

  await new Promise(resolve => setTimeout(resolve, 1000));
  await page.screenshot({ path: 'capstan-diagram.png' });
  await browser.close();
  console.log('Capstan diagram created!');
}

createCapstanDiagram().catch(console.error);
