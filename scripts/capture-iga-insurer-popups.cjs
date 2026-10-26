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
  // Save a complete DOM snapshot to identify the site's real insurance-card markup.
  fs.writeFileSync(path.join(root,'homepage.html'),await page.content(),'utf8');
  await page.screenshot({path:path.join(root,'homepage.png'),fullPage:true}).catch(()=>{});
  const candidates=await page.locator('img').evaluateAll(imgs=>imgs.map((img,i)=>{
    const parent=img.closest('a,button,[onclick],[data-bs-toggle],[data-toggle]')||img.parentElement;
    const box=img.getBoundingClientRect();
    return {i,alt:img.alt||'',src:img.currentSrc||img.src||'',text:(parent?.textContent||'').trim().slice(0,100),
      parentHTML:parent?.outerHTML.slice(0,1000)||'',clickable:!!img.closest('a,button,[onclick],[data-bs-toggle],[data-toggle]'),
      w:box.width,h:box.height};
  }).filter(x=>x.w>35&&x.w<320&&x.h>12&&x.h<160&&x.clickable&&!(/^(로고|logo)$/i.test(x.alt.trim()))));
  fs.writeFileSync(path.join(root,'image-candidates.json'),JSON.stringify(candidates,null,2));
  const seen=new Set();
  for(const candidate of candidates){
    const key=candidate.alt||candidate.src;if(seen.has(key))continue;seen.add(key);
    try{
      const img=page.locator('img').nth(candidate.i);if(!await img.isVisible())continue;
      await img.scrollIntoViewIfNeeded();
      const clicker=img.locator('xpath=ancestor::*[self::a or self::button or @onclick or @data-bs-toggle or @data-toggle][1]');
      if(await clicker.count())await clicker.click({timeout:5000});
      else continue;
      await page.waitForTimeout(500);
      const dialog=page.locator('[role="dialog"]:visible,.modal:visible,[class*="modal"]:visible,[class*="popup"]:visible,[id*="popup"]:visible,[id*="modal"]:visible').last();
      if(!await dialog.isVisible().catch(()=>false)){out.errors.push({candidate: candidate.alt||candidate.src,notice:'Clicked but no recognized dialog',url:page.url()});continue;}
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
 console.log('Captured',out.companies.length,'insurer dialogs;',out.errors.length,'errors; output:',root);console.log('Diagnostics: homepage.html, homepage.png, image-candidates.json')
})().catch(e=>{console.error(e);process.exitCode=1});
