// Crawl IGA insurance cards, detailed modals, tab contents and Kakao share controls.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const root = path.resolve('analysis','iga-insurer-popups');
fs.mkdirSync(root,{recursive:true});
const result = {source:'https://iga.pe.kr/index.php',capturedAt:new Date().toISOString(),companies:[],errors:[]};
const save = () => fs.writeFileSync(path.join(root,'insurer-popups.json'),JSON.stringify(result,null,2),'utf8');
const safe = s => String(s||'unknown').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,70);
const tabs = ['바로가기','연락처','보험금청구','매뉴얼','모바일청약','수납(은행/카드)'];
async function snapshot(page,folder,name) {
 const data=await page.evaluate(()=>{
  const nodes=[...document.querySelectorAll('[role="dialog"],.modal,[class*="modal"],[class*="popup"],[id*="modal"],[id*="popup"]')].filter(x=>{const r=x.getBoundingClientRect(),s=getComputedStyle(x);return r.width>400&&r.height>180&&s.display!=='none'&&s.visibility!=='hidden'});
  const el=nodes.sort((a,b)=>a.getBoundingClientRect().width*a.getBoundingClientRect().height-b.getBoundingClientRect().width*b.getBoundingClientRect().height)[0]||document.body;
  return {text:el.innerText,html:el.outerHTML,links:[...el.querySelectorAll('a[href]')].map(x=>({text:x.innerText,url:x.href})),images:[...el.querySelectorAll('img')].map(x=>({alt:x.alt,url:x.src})),tables:[...el.querySelectorAll('table')].map(t=>[...t.rows].map(r=>[...r.cells].map(c=>c.innerText))),buttons:[...el.querySelectorAll('button,[role="tab"],[onclick]')].map(x=>({text:x.innerText.trim(),html:x.outerHTML.slice(0,450)})),kakao:[...el.querySelectorAll('button,a,[onclick]')].filter(x=>/kakao|카카오|카톡/i.test(x.innerText+' '+x.outerHTML.slice(0,350))).map(x=>({text:x.innerText,html:x.outerHTML.slice(0,700)}))};
 });
 const prefix=path.join(folder,safe(name));
 fs.writeFileSync(prefix+'.json',JSON.stringify(data,null,2),'utf8');
 fs.writeFileSync(prefix+'.html',data.html,'utf8');
 await page.screenshot({path:prefix+'.png'}).catch(()=>{});
 return data;
}
(async()=>{
 const browser=await chromium.launch({headless:false});
 const page=await browser.newPage({viewport:{width:1450,height:980},acceptDownloads:true});
 try {
  await page.goto(result.source,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(1200);
  fs.writeFileSync(path.join(root,'homepage.html'),await page.content());
  await page.screenshot({path:path.join(root,'before-detail-click.png'),fullPage:true}).catch(()=>{});
  const buttons=page.getByText('상세보기',{exact:true});
  const count=await buttons.count();
  console.log('Found insurer detail buttons:',count);
  fs.writeFileSync(path.join(root,'detail-buttons.json'),JSON.stringify(await buttons.evaluateAll(els=>els.slice(0,50).map(e=>({html:e.outerHTML.slice(0,1000),parent:e.parentElement?.outerHTML.slice(0,1300)}))),null,2),'utf8');
  for(let i=0;i<count;i++){
   const company={index:i,name:'',tabs:{},errors:[]};
   try{
    const btn=page.getByText('상세보기',{exact:true}).nth(i);
    const card=await btn.evaluate(e=>{const c=e.closest('article,li,[class*="card"],[class*="item"]')||e.parentElement?.parentElement;return {text:c?.innerText||'',images:[...(c?.querySelectorAll('img')||[])].map(x=>({alt:x.alt,src:x.src}))}});
    company.name=card.text.replace(/상세보기/g,'').trim().slice(0,75)||'company-'+i;
    company.card=card;
    const folder=path.join(root,String(i+1).padStart(2,'0')+'-'+safe(company.name));
    fs.mkdirSync(folder,{recursive:true});
    // IGA uses nested text and delegated click handlers. Trigger the nearest actionable ancestor
    // directly in the page to avoid Playwright repeatedly scrolling the document.
    await btn.evaluate(el=>{
      const target=el.closest('button,a,[role="button"],[onclick]')||
                   el.parentElement?.closest('button,a,[role="button"],[onclick]')||
                   el;
      target.click();
    });
    await page.waitForTimeout(650);
    const isOpen=await page.evaluate(()=>{
      const share=[...document.querySelectorAll('button,a,[role="button"]')].some(x=>/카톡\\s*공유/.test(x.innerText||'')&&x.getBoundingClientRect().width>0);
      const tabs=[...document.querySelectorAll('button,[role="tab"]')].filter(x=>/^(바로가기|연락처|보험금청구|매뉴얼|모바일청약)/.test((x.innerText||'').trim())&&x.getBoundingClientRect().width>0);
      return share&&tabs.length>=3;
    });
    if(!isOpen){
      await page.screenshot({path:path.join(root,'failed-detail-click.png'),fullPage:true}).catch(()=>{});
      result.errors.push({index:i,reason:'Detail button did not open insurer modal',buttonHTML:await btn.evaluate(e=>e.outerHTML.slice(0,1100)),url:page.url()});
      save();
      console.log('STOP: detail click did not open modal; saved failed-detail-click.png');
      break;
    }
    company.initial=await snapshot(page,folder,'opened');
    for(let t=0;t<tabs.length;t++){
     const label=tabs[t],main=page.getByText(label,{exact:true}).filter({visible:true}).last();
     try{
      if(!(await main.count()))continue;
      await main.click({timeout:3000});await page.waitForTimeout(180);
      const tabFolder=path.join(folder,'tab-'+(t+1));fs.mkdirSync(tabFolder,{recursive:true});
      const parent=await snapshot(page,tabFolder,'main');
      company.tabs[label]={main:parent,nested:{}};
      // Record all tab-like controls and click previously unseen secondary labels.
      const subtabs=parent.buttons.filter(x=>x.text&&x.text.length<48&&!tabs.includes(x.text)&&!/^(닫기|×|카톡 공유|상세보기)$/i.test(x.text));
      const seen=new Set();
      for(const sub of subtabs.slice(0,25)){
       if(seen.has(sub.text))continue;seen.add(sub.text);
       const control=page.getByText(sub.text,{exact:true}).filter({visible:true}).last();
       try{
        if(!(await control.count()))continue;
        const tag=await control.evaluate(el=>el.tagName.toLowerCase());
        if(!['button','a'].includes(tag))continue;
        // Do not follow external links or activate destructive operations.
        const href=await control.getAttribute('href');
        if(href&&/^https?:/i.test(href))continue;
        if(/삭제|등록|저장|다운로드|공유|복사|출력|인쇄/.test(sub.text))continue;
        await control.click({timeout:1200});await page.waitForTimeout(120);
        company.tabs[label].nested[sub.text]=await snapshot(page,tabFolder,'sub-'+sub.text);
       }catch(e){company.errors.push({tab:label,sub:sub.text,error:String(e).slice(0,180)})}
      }
     }catch(e){company.errors.push({tab:label,error:String(e).slice(0,250)})}
    }
    result.companies.push(company);
    await page.keyboard.press('Escape').catch(()=>{});
    const close=page.getByText('닫기',{exact:true}).filter({visible:true}).last();
    if(await close.count())await close.click({timeout:1200}).catch(()=>{});
    save();console.log(i+1+'/'+count,company.name,Object.keys(company.tabs).length,'tabs');
   }catch(e){result.errors.push({index:i,error:String(e).slice(0,500)});await page.keyboard.press('Escape').catch(()=>{});save()}
  }
 }catch(e){result.errors.push({fatal:String(e)})}
 finally{save();await browser.close()}
 console.log('Captured',result.companies.length,'companies,',result.errors.length,'errors. Saved to:',root);
})().catch(e=>{console.error(e);process.exitCode=1});
