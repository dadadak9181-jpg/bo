
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const outputDir = path.join(__dirname, 'captured');
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({
    headless: false
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });

  try {
    console.log('사이트 접속 시작: https://iga.pe.kr');

    const response = await page.goto('https://iga.pe.kr', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('HTTP 상태:', response?.status());

    await page.waitForTimeout(3000);

    // 전체 화면 스크린샷
    await page.screenshot({
      path: path.join(outputDir, 'homepage.png'),
      fullPage: true
    });

    // HTML 저장
    fs.writeFileSync(
      path.join(outputDir, 'homepage.html'),
      await page.content(),
      'utf8'
    );

    // 링크 수집
    const links = await page.locator('a').evaluateAll(elements =>
      elements.map(el => ({
        text: el.innerText.trim(),
        href: el.href
      }))
    );

    fs.writeFileSync(
      path.join(outputDir, 'links.json'),
      JSON.stringify(links, null, 2),
      'utf8'
    );

    console.log('페이지 제목:', await page.title());
    console.log('수집된 링크:', links.length);
    console.log('수집 완료:', outputDir);

  } catch (error) {
    console.error('오류 발생:', error.message);
  } finally {
    await browser.close();
  }
})();
