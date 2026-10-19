const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const START = 'https://iga.pe.kr/';
const OUT = path.resolve(process.argv[2] || 'template-capture');
const MAX_SECTIONS = 40;
const MAX_URLS = 120;
const BLOCKED = /login|logout|signin|signup|register|member|mypage|password|auth|oauth|captcha|결제|회원가입|로그인/i;
const kind = url => /(?:write|edit|modify|form|mode=write|w=u)(?:[/?&#=]|$)/i.test(url) ? 'write' : /(?:view|detail|read|wr_id=|idx=|no=)/i.test(url) ? 'view' : /(?:list|board|bbs|category|bo_table=)/i.test(url) ? 'list' : 'other';
const normalize = href => { try { const u = new URL(href, START); u.hash=''; if(u.origin!==new URL(START).origin || BLOCKED.test(u.pathname+u.search))return null; return u.href; }catch{return null;} };
(async()=>{
  await fs.mkdir(OUT,{recursive:true});
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block',acceptDownloads:false});
  await context.route('**/*',route=>['image','media','font'].includes(route.request().resourceType()) ? route.abort() : route.continue());
  const page=await context.newPage();
  const queue=[START],seen=new Set(),saved=new Map(),report=[];
  const go=async url=>{try{const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:18000});await page.waitForTimeout(450);return response}catch{return null}};
  const links=async()=>page.locator('a[href]').evaluateAll(nodes=>nodes.map(a=>({href:a.href,text:(a.textContent||'').trim().slice(0,100)})));
  let sections=0;
  while(queue.length && seen.size<MAX_URLS && sections<MAX_SECTIONS){
    const url=queue.shift();if(seen.has(url))continue;seen.add(url);
    const res=await go(url);if(!res || res.status()>=400)continue;
    const current=page.url();if(BLOCKED.test(current)||await page.locator('input[type=password]').count())continue;
    const title=await page.title();
    const found=(await links()).filter(x=>normalize(x.href));
    if(url===START){for(const l of found){const u=normalize(l.href);if(u&&!queue.includes(u)&&!seen.has(u))queue.push(u);}}
    const category=kind(url);
    // Capture only one representative per page type and per menu/board, not every post.
    const parsed=new URL(url);
    const board=parsed.searchParams.get('bo_table')||parsed.pathname.split('/').filter(Boolean).slice(0,2).join('-')||'home';
    const key=board+':'+category;
    const hasEditor=await page.locator('textarea,[contenteditable=true],iframe[title*=editor i]').count()>0;
    const effective=hasEditor && category==='other'?'write':category;
    const saveKey=board+':'+effective;
    if(!saved.has(saveKey) && (effective!=='other'||url===START)){
      const html=await page.evaluate(()=>{const root=document.querySelector('main,#container,#content,.content,.container')||document.body;const clone=root.cloneNode(true);clone.querySelectorAll('script,iframe,video,audio').forEach(n=>n.remove());return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>Template reference</title></head><body>'+clone.outerHTML+'</body></html>';});
      const name=(board+'-'+effective).replace(/[^a-z0-9가-힣_-]/gi,'_').slice(0,90)+'.html';
      await fs.writeFile(path.join(OUT,name),html);
      saved.set(saveKey,name);sections++;
      report.push({menu:board,type:effective,title,url,file:name});
      // Discover only representative list/view/write links from this section.
      const candidates=found.filter(x=>kind(x.href)!=='other'||/쓰기|글쓰기|목록|상세|보기/i.test(x.text));
      const chosen=new Map();
      for(const x of candidates){const u=normalize(x.href);if(!u)continue;const k=kind(u);if(!chosen.has(k))chosen.set(k,u);}
      for(const u of chosen.values())if(!seen.has(u)&&!queue.includes(u))queue.push(u);
    }
  }
  await fs.writeFile(path.join(OUT,'manifest.json'),JSON.stringify({source:START,captured:report,skipped:'login/member pages; image/font/media assets; duplicate article pages'},null,2));
  await browser.close();
  console.log('Saved '+report.length+' representative templates in '+OUT);
})().catch(e=>{console.error(e);process.exitCode=1});
