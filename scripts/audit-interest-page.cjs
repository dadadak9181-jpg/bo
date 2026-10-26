// IGA interest calculator structure audit - captures public page only.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const out = path.resolve('analysis', 'interest-original');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  try {
    const response = await page.goto('https://iga.pe.kr/board/calculator/interest.php', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(1500);
    await page.screenshot({path:path.join(out,'00-full-page.png'),fullPage:true,animations:'disabled'});
    fs.writeFileSync(path.join(out,'original.html'),await page.content(),'utf8');
    const data = await page.evaluate(() => {
      const visible = e => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
      const fields = [...document.querySelectorAll('input,select,textarea,button')].filter(visible).map(e => ({
        tag:e.tagName.toLowerCase(),type:e.type||'',name:e.name||'',id:e.id||'',
        text:(e.innerText||e.value||'').trim().slice(0,120),placeholder:e.placeholder||'',
        options:e.tagName==='SELECT'?[...e.options].map(o=>({text:o.text,value:o.value})):undefined,
        outerHTML:e.outerHTML.slice(0,750)
      }));
      return {url:location.href,title:document.title,headings:[...document.querySelectorAll('h1,h2,h3,h4')].filter(visible).map(e=>e.innerText.trim()),fields,
        tables:[...document.querySelectorAll('table')].map(t=>({headers:[...t.querySelectorAll('th')].map(x=>x.innerText.trim()),rows:t.rows.length})),
        links:[...document.querySelectorAll('a[href]')].filter(visible).map(a=>({text:a.innerText.trim().slice(0,70),href:a.href})).slice(0,100),
        scripts:[...document.scripts].map(s=>s.src).filter(Boolean),
        bodyText:document.body.innerText.slice(0,30000)};
    });
    data.httpStatus=response?.status()||null;data.pageErrors=errors;
    fs.writeFileSync(path.join(out,'structure.json'),JSON.stringify(data,null,2),'utf8');
    // Keep tabs discoverable without mutating input values or triggering financial transactions.
    const candidates = page.locator('[role="tab"], .tab a, .tabs a, .tab button, .tabs button');
    const n=Math.min(await candidates.count(),12);
    for(let i=0;i<n;i++){
      const tab=candidates.nth(i);const label=(await tab.innerText().catch(()=>''))?.trim();
      if(!label)continue;
      try {
        await tab.click({timeout:2000});
        await page.waitForTimeout(300);
        await page.screenshot({path:path.join(out,`tab-${String(i+1).padStart(2,'0')}.png`),fullPage:true,animations:'disabled'});
      }catch(err){errors.push('tab '+label+': '+String(err).slice(0,160))}
    }
    fs.writeFileSync(path.join(out,'errors.json'),JSON.stringify(errors,null,2),'utf8');
    console.log('AUDIT COMPLETE:',out,'fields:',data.fields.length,'tabs:',n,'HTTP:',data.httpStatus);
  } catch(e) {
    fs.writeFileSync(path.join(out,'failure.txt'),String(e.stack||e),'utf8');
    console.error('AUDIT FAILED:',e.message);process.exitCode=1;
  } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
