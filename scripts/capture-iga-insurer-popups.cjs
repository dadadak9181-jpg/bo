// Run locally: node scripts/capture-iga-insurer-popups.cjs
// Requires: npm install playwright && npx playwright install chromium
const { chromium } = require('playwright');
const fs=require('fs'),path=require('path');
const root=path.resolve(process.cwd(),'analysis','iga-insurer-popups');
fs.mkdirSync(root,{recursive:true});
const out={source:'https://iga.pe.kr/index.php',capturedAt:new Date().toISOString(),companies:[],errors:[]};
const tabs=['바로가기','연락처','보험금청구','매뉴얼','모바일청약','수납'];
function safe(s){return String(s).replace(/[\\/:*?"<>|]/g,'_').slice(0,75)}
async function save(){fs.writeFileSync(path.join(root,'insurer-popups.json'),JSON.stringify(out,null,2),'utf8')}
(async()=>{
 const browser=await chromium.launch({headless:false});
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
 try{
  await page.goto(out.source,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(2000);
  const candidates=await page.locator('img').evaluateAll(imgs=>imgs.map((img,i)=>({i,alt:img.alt||'',src:img.currentSrc||img.src||'',text:(img.closest('a,button')?.textContent||'').trim(),w:img.getBoundingClientRect().width,h:img.getBoundingClientRect().height})).filter(x=>x.w>35&&x.w<320&&x.h>12&&x.h<160));
  fs.writeFileSync(path.join(root,'image-candidates.json'),JSON.stringify(candidates,null,2));
  const seen=new Set();
  for(const candidate of candidates){
    const key=candidate.alt||candidate.src;if(seen.has(key))continue;seen.add(key);
    try{
      const img=page.locator('img').nth(candidate.i);if(!await img.isVisible())continue;
      await img.scrollIntoViewIfNeeded();await img.click({timeout:2500});
      await page.waitForTimeout(500);
      const dialog=page.locator('[role=dialog], [class*=modal]:visible, [class*=popup]:visible').last();
      if(!await dialog.isVisible().catch(()=>false))continue;
      const name=(await dialog.locator('h1,h2,h3').first().innerText().catch(()=>''))||candidate.alt||'company-'+candidate.i;
      const entry={name,logoCandidate:candidate,tabs:{}};
      const folder=path.join(root,safe(name));fs.mkdirSync(folder,{recursive:true});
      for(const label of tabs){
        const button=dialog.getByText(label,{exact:true}).first();
        if(!await button.isVisible().catch(()=>false))continue;
        await button.click().catch(()=>{});
        await page.waitForTimeout(300);
        entry.tabs[label]=await dialog.evaluate(el=>({
          text:el.innerText,
          html:el.outerHTML,
          links:Array.from(el.querySelectorAll('a[href]')).map(a=>({text:a.innerText,href:a.href})),
          images:Array.from(el.querySelectorAll('img')).map(a=>({alt:a.alt,src:a.currentSrc||a.src})),
          tables:Array.from(el.querySelectorAll('table')).map(t=>Array.from(t.rows).map(r=>Array.from(r.cells).map(c=>c.innerText)))
        }));
        await dialog.screenshot({path:path.join(folder,safe(label)+'.png')}).catch(()=>{});
        fs.writeFileSync(path.join(folder,safe(label)+'.html'),entry.tabs[label].html,'utf8');
      }
      if(Object.keys(entry.tabs).length)out.companies.push(entry);
      const close=dialog.locator('button[aria-label*=닫],button:has-text("닫기"),button:has-text("×")').first();
      if(await close.count())await close.click().catch(()=>page.keyboard.press('Escape'));
      else await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
      await save();
    }catch(e){out.errors.push({candidate,error:String(e).slice(0,400)});await page.keyboard.press('Escape').catch(()=>{})}
  }
 }catch(e){out.errors.push({fatal:String(e)})}finally{await save();await browser.close()}
 console.log('Captured',out.companies.length,'insurer dialogs;',out.errors.length,'errors; output:',root)
})().catch(e=>{console.error(e);process.exitCode=1});
