const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  // Desktop screenshot (landscape)
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await desktop.goto('http://localhost:5173/index.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await desktop.waitForTimeout(4000);
  await desktop.screenshot({ path: '/root/vibe-drive-jersey/screenshot-desktop.png' });
  console.log('Desktop screenshot saved');
  
  // Drive a bit for an action shot on desktop
  await desktop.keyboard.down('ArrowUp');
  await desktop.waitForTimeout(2000);
  await desktop.keyboard.down('ArrowRight');
  await desktop.waitForTimeout(1000);
  await desktop.screenshot({ path: '/root/vibe-drive-jersey/screenshot-driving.png' });
  console.log('Driving screenshot saved');
  await desktop.keyboard.up('ArrowRight');
  await desktop.keyboard.up('ArrowUp');
  
  // iPhone portrait screenshot
  const iphone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await iphone.goto('http://localhost:5173/index.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await iphone.waitForTimeout(4000);
  await iphone.screenshot({ path: '/root/vibe-drive-jersey/screenshot-iphone.png' });
  console.log('iPhone screenshot saved');
  
  await browser.close();
  console.log('All screenshots done');
})();