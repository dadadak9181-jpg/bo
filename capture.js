const { chromium } = require('playwright');
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const BASE='https://iga.pe.kr/',OUT='captured-templates',MAX=350;
const save=(n,v)=>fs.writeFileSync(path.join(OUT,n),JSON.stringify(v,null,2));
const normalize=u=>{try{const x=new URL(u,BASE);x.hash='';return x.origin===new URL(BASE).origin?x.href:null}catch{return null}};
(async()=>{
fs.mkdirSync(path.join(OUT,'pages'),{recursive:true});fs.mkdirSync(path.join(OUT,'screenshots'),{recursive:true});
const browser=await chromium.launch({headless:process.env.HEADLESS!=='false'});
const context=await browser.newContext({viewport:{width:1440,height:900}});
await context.route('**/*',r=>/^(font|media)$/.test(r.request().resourceType())?r.abort():r.continue());
const page=await context.newPage(),queue=[{url:BASE,label:'홈',depth:0}],seen=new Set(),menus=[],pages=[],errors=[];
const start=Date.now();
while(queue.length&&seen.size<MAX&&Date.now()-start<900000){
const m=queue.shift(),url=normalize(m.url);if(!url||seen.has(url)||m.depth>7||/(login|signin|signup|member|mypage|admin|logout)/i.test(url))continue;seen.add(url);
try{const r=await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});if(r.status()>=400)throw Error('HTTP '+r.status());
if(await page.locator('input[type=password]').count())continue;
const triggers=await page.locator('nav a,header a,[class*=menu] a,[class*=gnb] a,[class*=submenu] a').all();
for(const el of triggers.slice(0,160)){try{await el.hover({timeout:500});await page.waitForTimeout(80)}catch{}}
const links=await page.locator('a[href]').evaluateAll(as=>as.map(a=>({url:a.href,label:(a.innerText||a.title||'').trim().slice(0,80),nav:!!a.closest('nav,header,[class*=menu],[class*=gnb],[class*=submenu]')})));
for(const l of links){const next=normalize(l.url);if(next&&l.nav&&l.label&&!seen.has(next))queue.push({url:next,label:l.label,depth:m.depth+1,parent:url})}
const id=crypto.createHash('sha1').update(url).digest('hex').slice(0,12);
await page.screenshot({path:path.join(OUT,'screenshots',id+'.png'),fullPage:true,timeout:20000});
fs.writeFileSync(path.join(OUT,'pages',id+'.html'),await page.content());
menus.push(m);pages.push({...m,id,title:await page.title(),screenshot:'screenshots/'+id+'.png',html:'pages/'+id+'.html'});
if(/(board|bbs|list|gallery)/i.test(url)){const detail=links.find(l=>!l.nav&&/(view|detail|read|idx=|no=)/i.test(l.url));if(detail)queue.push({url:detail.url,label:'대표 상세: '+detail.label,depth:m.depth+1,parent:url})}
}catch(e){errors.push({url,error:e.message})}
save('menus.json',menus);save('templates.json',pages);save('errors.json',errors);
}
await browser.close();console.log('saved',pages.length,'errors',errors.length);
})().catch(console.error);