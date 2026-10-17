
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE_URL = 'https://iga.pe.kr/';
const ROOT = new URL(BASE_URL).origin;
const OUT = path.join(__dirname, 'captured');

const MAX_PAGES = 200;
const DELAY = 500;

const dirs = {
  pages: path.join(OUT, 'pages'),
  assets: path.join(OUT, 'assets'),
  screenshots: path.join(OUT, 'screenshots')
};

Object.values(dirs).forEach(dir =>
  fs.mkdirSync(dir, { recursive: true })
);

const visited = new Set();
const queue = [BASE_URL];
const assets = new Map();
const menuLinks = new Map();
const errors = [];

const sleep = ms => new Promise(r => setTimeout(r, ms));

function hash(str) {
  return crypto.createHash('sha256')
    .update(str).digest('hex').slice(0, 12);
}

function safeUrl(url, base = BASE_URL) {
  try {
    const u = new URL(url, base);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    u.hash = '';
    return u.href;
  } catch {
    return null;
  }
}

function isInternal(url) {
  try {
    return new URL(url).origin === ROOT;
  } catch {
    return false;
  }
}

function pageFile(url) {
  if (url === BASE_URL || url === ROOT + '/') {
    return 'homepage.html';
  }
  return `pages/${hash(url)}.html`;
}

function assetFile(url, type = '') {
  const u = new URL(url);
  let ext = path.extname(u.pathname).toLowerCase();

  const mime = type.split(';')[0].trim().toLowerCase();

  const types = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
    'image/avif': '.avif',
    'image/x-icon': '.ico',
    'text/css': '.css',
    'application/javascript': '.js',
    'text/javascript': '.js',
    'font/woff': '.woff',
    'font/woff2': '.woff2',
    'font/ttf': '.ttf',
    'font/otf': '.otf'
  };

  if (!ext || ext.length > 8 || !/^\.[a-z0-9]+$/.test(ext)) {
    ext = types[mime] || '.bin';
  }

  return `assets/${hash(url)}${ext}`;
}

function relativePath(from, to) {
  return path.posix.relative(
    path.posix.dirname(from),
    to
  ) || path.posix.basename(to);
}

function enqueue(url) {
  const normalized = safeUrl(url);
  if (!normalized || !isInternal(normalized)) return;

  if (
    /\.(jpg|jpeg|png|gif|svg|webp|avif|ico|css|js|pdf|zip|woff2?|ttf|mp4|mp3)(\?|$)/i
      .test(normalized)
  ) return;

  if (!visited.has(normalized) && !queue.includes(normalized)) {
    queue.push(normalized);
  }
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    let last = 0;

    for (let i = 0; i < 100; i++) {
      const height = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );

      window.scrollTo(0, Math.min(i * 650, height));
      await wait(120);

      if (i * 650 >= height && height === last) break;
      last = height;
    }

    window.scrollTo(0, 0);
  });
}

async function expandMenus(page) {
  const selectors = [
    'nav a',
    'nav button',
    'header a',
    'header button',
    '[class*="menu"] a',
    '[class*="menu"] button',
    '[class*="dropdown"] a',
    '[class*="dropdown"] button',
    '[class*="submenu"] a',
    '[class*="submenu"] button',
    '[aria-haspopup]',
    '[role="menuitem"]'
  ];

  const selector = selectors.join(',');

  // 여러 차례 순회해 동적으로 나타난 하위 메뉴도 탐색
  for (let depth = 0; depth < 4; depth++) {
    const locator = page.locator(selector);
    const count = Math.min(await locator.count(), 300);

    for (let i = 0; i < count; i++) {
      try {
        const item = locator.nth(i);
        if (!await item.isVisible()) continue;

        await item.hover({ timeout: 1500 });
        await sleep(120);

        await collectLinks(page);

        // 메뉴를 여는 버튼만 클릭
        const tag = await item.evaluate(el => el.tagName);
        const popup = await item.getAttribute('aria-haspopup');
        const expanded = await item.getAttribute('aria-expanded');

        if (
          tag === 'BUTTON' &&
          (popup || expanded !== null)
        ) {
          await item.click({ timeout: 1000 });
          await sleep(150);
          await collectLinks(page);
        }
      } catch {
        // 메뉴 변경 또는 사라진 요소는 건너뜀
      }
    }
  }
}

async function collectLinks(page) {
  const links = await page.locator('a[href]').evaluateAll(els =>
    els.map(a => ({
      text: (a.innerText || a.textContent || '').trim(),
      href: a.href
    }))
  );

  for (const link of links) {
    const url = safeUrl(link.href, page.url());
    if (!url) continue;

    if (!menuLinks.has(url)) {
      menuLinks.set(url, {
        text: link.text,
        url
      });
    }

    enqueue(url);
  }
}

async function collectResourceUrls(page) {
  return page.evaluate(() => {
    const urls = new Set();

    document.querySelectorAll(
      'img, source, video, audio, script, link'
    ).forEach(el => {
      for (const attr of ['src', 'href', 'poster']) {
        const value = el.getAttribute(attr);
        if (value) {
          try {
            urls.add(new URL(value, document.baseURI).href);
          } catch {}
        }
      }

      const srcset = el.getAttribute('srcset');
      if (srcset) {
        srcset.split(',').forEach(part => {
          const value = part.trim().split(/\s+/)[0];
          try {
            urls.add(new URL(value, document.baseURI).href);
          } catch {}
        });
      }
    });

    document.querySelectorAll('*').forEach(el => {
      const styles = [
        getComputedStyle(el).backgroundImage,
        getComputedStyle(el, '::before').backgroundImage,
        getComputedStyle(el, '::after').backgroundImage
      ];

      for (const style of styles) {
        for (const match of style.matchAll(
          /url\(\s*["']?([^"')]+)["']?\s*\)/g
        )) {
          try {
            urls.add(new URL(match[1], document.baseURI).href);
          } catch {}
        }
      }
    });

    return [...urls].filter(u => /^https?:\/\//.test(u));
  });
}

async function downloadAsset(context, url) {
  if (assets.has(url)) return assets.get(url);

  try {
    const response = await context.request.get(url, {
      timeout: 20000,
      maxRedirects: 5
    });

    if (!response.ok()) return null;

    const type = response.headers()['content-type'] || '';

    // HTML/API 응답은 리소스로 저장하지 않음
    if (
      type.includes('text/html') ||
      type.includes('application/json')
    ) return null;

    const body = await response.body();
    const file = assetFile(url, type);

    fs.writeFileSync(path.join(OUT, file), body);

    assets.set(url, file);
    console.log('  리소스:', file);

    return file;
  } catch (err) {
    errors.push({ url, error: err.message });
    return null;
  }
}

async function capturePage(browser, url, index) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    serviceWorkers: 'block',
    acceptDownloads: true
  });

  const page = await context.newPage();

  const pending = new Set();

  // 브라우저가 실제 받은 이미지/CSS/JS/폰트 저장
  page.on('response', response => {
    const task = (async () => {
      try {
        if (!response.ok()) return;

        const request = response.request();
        const type = response.headers()['content-type'] || '';

        if (
          !['image', 'stylesheet', 'script', 'font', 'media']
            .includes(request.resourceType()) &&
          !/^(image\/|text\/css|font\/)/.test(type)
        ) return;

        const resourceUrl = response.url();
        if (assets.has(resourceUrl)) return;

        const body = await response.body();
        const file = assetFile(resourceUrl, type);

        fs.writeFileSync(path.join(OUT, file), body);
        assets.set(resourceUrl, file);
      } catch {}
    })();

    pending.add(task);
    task.finally(() => pending.delete(task));
  });

  try {
    console.log(`\n[${index}] 방문: ${url}`);

    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    if (!response || !response.ok()) {
      console.log('HTTP 오류:', response?.status());
      return;
    }

    await sleep(1000);
    await autoScroll(page);
    await expandMenus(page);
    await collectLinks(page);

    const resourceUrls = await collectResourceUrls(page);

    for (const resourceUrl of resourceUrls) {
      await downloadAsset(context, resourceUrl);
    }

    await Promise.allSettled([...pending]);

    const file = pageFile(url);

    // DOM에 표시된 리소스 URL을 로컬 경로로 변경
    await page.evaluate(({ mappings, currentFile }) => {
      const map = new Map(mappings);

      const relative = target => {
        const from = currentFile.split('/').slice(0, -1);
        const to = target.split('/');

        while (from.length && to.length && from[0] === to[0]) {
          from.shift();
          to.shift();
        }

        return [...from.map(() => '..'), ...to].join('/');
      };

      const resolve = value => {
        if (!value || value.startsWith('data:')) return value;
        try {
          const absolute = new URL(value, document.baseURI).href;
          return map.has(absolute)
            ? relative(map.get(absolute))
            : value;
        } catch {
          return value;
        }
      };

      document.querySelectorAll(
        'img, source, script, link, video, audio'
      ).forEach(el => {
        for (const attr of ['src', 'href', 'poster']) {
          const value = el.getAttribute(attr);
          if (value) el.setAttribute(attr, resolve(value));
        }

        const srcset = el.getAttribute('srcset');
        if (srcset) {
          el.setAttribute(
            'srcset',
            srcset.split(',').map(part => {
              const pieces = part.trim().split(/\s+/);
              pieces[0] = resolve(pieces[0]);
              return pieces.join(' ');
            }).join(', ')
          );
        }
      });

      document.querySelectorAll('a[href]').forEach(a => {
        try {
          const absolute = new URL(a.getAttribute('href'), document.baseURI);
          absolute.hash = '';

          if (absolute.origin === location.origin) {
            const target = absolute.href === location.origin + '/'
              ? 'homepage.html'
              : `pages/${absolute.href.split('').reduce(
                  (h, c) => ((h * 31 + c.charCodeAt(0)) >>> 0), 0
                ).toString(16)}.html`;

            // 실제 파일명 매핑은 아래에서 별도 처리
          }
        } catch {}
      });

      // 인라인 스타일의 이미지 주소
      document.querySelectorAll('[style]').forEach(el => {
        const style = el.getAttribute('style');
        el.setAttribute(
          'style',
          style.replace(
            /url\(\s*["']?([^"')]+)["']?\s*\)/g,
            (full, value) => `url("${resolve(value)}")`
          )
        );
      });

    }, {
      mappings: [...assets.entries()],
      currentFile: file
    });

    // 내부 페이지 링크를 실제 저장 파일명으로 변경
    await page.evaluate(({ pages, currentFile }) => {
      const map = new Map(pages);

      const rel = target => {
        const from = currentFile.split('/').slice(0, -1);
        const to = target.split('/');

        while (from.length && to.length && from[0] === to[0]) {
          from.shift();
          to.shift();
        }

        return [...from.map(() => '..'), ...to].join('/');
      };

      document.querySelectorAll('a[href]').forEach(a => {
        try {
          const u = new URL(a.href);
          const fragment = u.hash;
          u.hash = '';

          if (map.has(u.href)) {
            a.setAttribute('href', rel(map.get(u.href)) + fragment);
          }
        } catch {}
      });
    }, {
      pages: [...new Set([...visited, ...queue, BASE_URL])]
        .map(u => [u, pageFile(u)]),
      currentFile: file
    });

    const html = await page.content();

    fs.writeFileSync(
      path.join(OUT, file),
      html,
      'utf8'
    );

    // 스크린샷은 원본 화면 기준으로 다시 방문해 촬영
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    await sleep(1000);
    await autoScroll(page);

    await page.screenshot({
      path: path.join(
        dirs.screenshots,
        `${hash(url)}.png`
      ),
      fullPage: true
    });

    console.log('저장:', file);
    console.log('대기 페이지:', queue.length);
    console.log('리소스:', assets.size);

  } catch (err) {
    console.error('페이지 오류:', err.message);
    errors.push({ url, error: err.message });
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({
    headless: false
  });

  try {
    let index = 0;

    while (queue.length && index < MAX_PAGES) {
      const url = queue.shift();

      if (visited.has(url)) continue;
      visited.add(url);

      index++;

      await capturePage(browser, url, index);
      await sleep(DELAY);
    }

    fs.writeFileSync(
      path.join(OUT, 'sitemap.json'),
      JSON.stringify([...visited], null, 2),
      'utf8'
    );

    fs.writeFileSync(
      path.join(OUT, 'menu-links.json'),
      JSON.stringify([...menuLinks.values()], null, 2),
      'utf8'
    );

    fs.writeFileSync(
      path.join(OUT, 'assets.json'),
      JSON.stringify(
        [...assets.entries()].map(([url, file]) => ({
          url, file
        })),
        null,
        2
      ),
      'utf8'
    );

    fs.writeFileSync(
      path.join(OUT, 'errors.json'),
      JSON.stringify(errors, null, 2),
      'utf8'
    );

    console.log('\n========== 수집 완료 ==========');
    console.log('방문 페이지:', visited.size);
    console.log('발견 메뉴/링크:', menuLinks.size);
    console.log('저장 리소스:', assets.size);
    console.log('오류:', errors.length);
    console.log('저장 위치:', OUT);

  } finally {
    await browser.close();
  }
})();
