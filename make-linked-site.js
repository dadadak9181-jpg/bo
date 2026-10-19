const fs=require('fs'),path=require('path');
const root=path.resolve('captured-templates-v3');
const pages=JSON.parse(fs.readFileSync(path.join(root,'templates.json'),'utf8'));
const map=new Map();
function key(value){try{const u=new URL(value,'https://iga.pe.kr/');if(u.origin!=='https://iga.pe.kr')return null;const b=u.searchParams.get('bo_table');return u.pathname+(b?'?bo_table='+encodeURIComponent(b):'');}catch{return null}}
for(const p of pages){const k=key(p.url);if(k&&!map.has(k))map.set(k,'/'+p.html.replaceAll('\\','/'))}
const homepage=map.get('/')||map.get('/index.php')||'/index.html';
const items=pages.filter(p=>p.kind==='menu'&&key(p.url)!=='/'&&key(p.url)!=='/index.php');
const escape=s=>String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const nav='<nav id="local-site-menu"><a href="'+homepage+'">홈</a>'+items.map(p=>'<a href="/'+p.html+'">'+escape(p.label||p.title||new URL(p.url).pathname)+'</a>').join('')+'</nav>';
const css='<style id="local-site-style">#local-site-menu{position:sticky;top:0;z-index:2147483647;display:flex;align-items:center;gap:8px;overflow-x:auto;padding:12px 20px;background:#12233b;color:white;font:14px Arial,sans-serif}#local-site-menu a{white-space:nowrap;color:white;text-decoration:none;padding:8px 10px;border-radius:6px}#local-site-menu a:hover{background:#365679}#local-site-note{padding:8px 20px;background:#fff3d5;color:#5d460c;font:12px Arial,sans-serif}</style>';
let changed=0,linked=0,unmatched=new Set();
for(const p of pages){
 const f=path.join(root,p.html);let html=fs.readFileSync(f,'utf8');
 html=html.replace(/<base\b[^>]*>/gi,'');
 html=html.replace(/<a\b[^>]*>/gi,tag=>tag.replace(/\bhref\s*=\s*(["'])(.*?)\1/i,(full,q,href)=>{
   if(href.startsWith('#')||href.startsWith('javascript:')||href.startsWith('mailto:')||href.startsWith('tel:'))return full;
   const k=key(href);if(!k)return full;
   const target=map.get(k);
   if(!target){unmatched.add(k);return full}
   linked++;return 'href='+q+target+q;
 }));
 html=html.replace(/<body([^>]*)>/i,(_,attrs)=>'<body'+attrs+'>'+css+nav+'<div id="local-site-note">수집된 페이지 간 이동용 미리보기입니다. 일부 게시글·로그인·쓰기 기능은 포함되지 않았습니다.</div>');
 fs.writeFileSync(f,html,'utf8');changed++;
}
const index='<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>IGA 연결형 사이트</title><style>body{font-family:Arial,"Malgun Gothic",sans-serif;margin:0;background:#f5f7fa;color:#1d2a3c}header{padding:42px max(24px,calc((100vw - 1120px)/2));background:#12233b;color:white}h1{margin:0 0 10px}main{max-width:1120px;margin:35px auto;padding:0 24px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px}a.card{display:block;text-decoration:none;background:white;color:inherit;border:1px solid #e2e7ed;border-radius:12px;overflow:hidden}img{width:100%;height:150px;object-fit:cover;object-position:top}strong,small{display:block;margin:12px 16px}small{color:#718096;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}</style></head><body><header><h1>IGA 페이지 연결형 미리보기</h1><p>각 메뉴를 클릭하면 배포된 사이트 내부의 수집 화면으로 이동합니다.</p><a style="color:#fff" href="'+homepage+'">원본 구조 홈 화면 열기 →</a></header><main><div class="grid">'+items.map(p=>'<a class="card" href="/'+p.html+'"><img src="/'+p.screenshot+'" alt=""><strong>'+escape(p.label||p.title)+'</strong><small>'+escape(p.url)+'</small></a>').join('')+'</div></main></body></html>';
fs.writeFileSync(path.join(root,'index.html'),index);
fs.writeFileSync(path.join(root,'link-report.json'),JSON.stringify({pages:changed,linksRewritten:linked,unmatched:[...unmatched].sort()},null,2));
console.log('Linked pages:',changed,'rewritten links:',linked,'unmatched URL types:',unmatched.size);
console.log('Deploy with: vercel --prod --cwd ".\\captured-templates-v3"');
