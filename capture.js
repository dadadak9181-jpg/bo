const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BASE = 'https://iga.pe.kr/';
const OUT = path.resolve('captured-templates-v2');
const MAX_PAGES = 80, MAX_BYTES = 100 * 1024 * 1024, MAX_MS = 12 * 60 * 1000;
const baseOrigin = new URL(BASE).origin;
const normalize = input => {
  try {
    const u = new URL(input, BASE); u.hash = ''; u.search = '';
    if (u.origin !== baseOrigin || !/^https?:$/.test(u.protocol)) return null;
    if (/\.(pdf|zip|jpg|jpeg|png|gif|webp|svg|mp4|xlsx?|docx?|hwp)(\?|$)/i.test(u.pathname)) return null;
    if (/(login|signin|signup|member|mypage|admin|logout|join|register)/i.test(u.pathname + u.search)) return null;
    return u.href;
  } catch { return null; }
};
const output = (name, data) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2));
(async () => {
  fs.mkdirSync(path.join(OUT, 'pages'), {recursive:true});
  fs.mkdirSync(path.join(OUT, 'screenshots'), {recursive:true});
  const browser = await chromium.launch({headless:process.env.HEADLESS !== 'false'});
  const context = await browser.newContext({viewport:{width:1440,height:900}, serviceWorkers:'block'});
  await context.route('**/*', route => {
    const req = route.request(), type = req.resourceType();
    if (['image','font','media'].includes(type)) return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  const queue = [{url:BASE,label:'홈',depth:0,kind:'menu'}], seen = new Set();
  const pages = [], menus = [], errors = [], started = Date.now();
  let bytes = 0;
  try {
    while (queue.length && pages.length < MAX_PAGES && bytes < MAX_BYTES && Date.now()-started < MAX_MS) {
      const item = queue.shift(), url = normalize(item.url);
      if (!url || seen.has(url) || item.depth > 7) continue;
      seen.add(url);
      try {
        const response = await page.goto(url,{waitUntil:'domcontentloaded',timeout:18000});
        if (!response || response.status() >= 400) throw Error('HTTP ' + (response?.status() ?? 'no response'));
        if (await page.locator('input[type=password]').count()) continue;
        const nav = page.locator('nav a, header a, [class*=gnb] a, [class*=menu] a, [class*=submenu] a');
        const n = Math.min(await nav.count(),120);
        for (let i=0;i<n;i++) {
          try { await nav.nth(i).hover({timeout:500}); } catch {}
        }
        const links = await page.locator('a[href]').evaluateAll(as => as.map(a=>({
          url:a.href, label:(a.innerText||a.title||'').trim().slice(0,80),
          nav:!!a.closest('nav,header,[class*=gnb],[class*=menu],[class*=submenu]')
        })));
        for (const link of links) {
          const next = normalize(link.url);
          if (next && (link.nav || new URL(next).pathname.startsWith('/board/') || new URL(next).pathname === '/index.php') && !seen.has(next) && !queue.some(q=>q.url===next))
            queue.push({url:next,label:link.label || new URL(next).pathname,depth:item.depth+1,parent:url,kind:'menu'});
        }
        // Only one representative detail link per menu page; never follow pagination.
        if (item.kind === 'menu' && (new URL(url).pathname.endsWith('/board.php') || new URL(url).pathname.startsWith('/board/news/'))) {
          const detail = links.find(l=>!l.nav && /(view|detail|read|idx=|no=)/i.test(l.url));
          const next = detail && normalize(detail.url);
          if (next && !seen.has(next) && !queue.some(q=>q.url===next))
            queue.push({url:next,label:'대표 상세',depth:item.depth+1,parent:url,kind:'detail'});
        }
        const id = crypto.createHash('sha1').update(url).digest('hex').slice(0,12);
        const html = await page.content();
        const htmlBytes = Buffer.byteLength(html);
        if (htmlBytes > 2*1024*1024 || bytes + htmlBytes > MAX_BYTES) { errors.push({url,error:'HTML size limit'}); continue; }
        const shot = await page.screenshot({type:'jpeg',quality:65,fullPage:false,timeout:10000});
        if (bytes + htmlBytes + shot.length > MAX_BYTES) break;
        fs.writeFileSync(path.join(OUT,'pages',id+'.html'),html);
        fs.writeFileSync(path.join(OUT,'screenshots',id+'.jpg'),shot);
        bytes += htmlBytes + shot.length;
        pages.push({...item,url,id,title:await page.title(),html:'pages/'+id+'.html',screenshot:'screenshots/'+id+'.jpg'});
        if (item.kind==='menu') menus.push({url,label:item.label,parent:item.parent||null});
        console.log('['+pages.length+'/'+MAX_PAGES+'] '+url+' ('+(bytes/1048576).toFixed(1)+' MB)');
      } catch(e) { errors.push({url,error:String(e.message).slice(0,200)}); }
      output('menus.json',menus);output('templates.json',pages);output('errors.json',errors);
    }
  } finally { await browser.close(); }
  console.log('Finished: '+pages.length+' pages, '+(bytes/1048576).toFixed(1)+' MB, '+errors.length+' errors');
})().catch(e=>{console.error(e);process.exitCode=1;});
