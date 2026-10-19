const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve('captured-templates-v3');
const pages=JSON.parse(fs.readFileSync(path.join(root,'templates.json'),'utf8'));
const assets=path.join(root,'assets');fs.mkdirSync(assets,{recursive:true});
const MAX_FILES=400,MAX_TOTAL=60*1024*1024,MAX_ONE=3*1024*1024;
let total=0,downloaded=0,replaced=0,failed=[];
const cache=new Map();
function absolute(v,base){try{if(!v||v.startsWith('data:')||v.startsWith('blob:')||v.startsWith('#'))return null;const u=new URL(v,base);if(!['http:','https:'].includes(u.protocol))return null;return u.href}catch{return null}}
function ext(u,type){const p=new URL(u).pathname.toLowerCase();const e=path.extname(p);if(['.jpg','.jpeg','.png','.gif','.webp','.svg','.avif','.ico'].includes(e))return e;if(type.includes('svg'))return '.svg';if(type.includes('png'))return '.png';if(type.includes('webp'))return '.webp';if(type.includes('gif'))return '.gif';return '.jpg'}
async function fetchImage(value,base){
 const url=absolute(value,base);if(!url)return null;
 if(cache.has(url))return cache.get(url);
 if(downloaded>=MAX_FILES||total>=MAX_TOTAL)return null;
 try{
  const res=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0','Referer':'https://iga.pe.kr/'},signal:AbortSignal.timeout(12000)});
  if(!res.ok)throw Error('HTTP '+res.status);
  const type=(res.headers.get('content-type')||'').toLowerCase();
  if(!type.startsWith('image/')&&!['.svg','.jpg','.jpeg','.png','.gif','.webp','.avif'].some(x=>new URL(url).pathname.toLowerCase().endsWith(x)))throw Error('Not image '+type);
  const length=Number(res.headers.get('content-length')||0);if(length>MAX_ONE)throw Error('Too large');
  const buf=Buffer.from(await res.arrayBuffer());if(buf.length>MAX_ONE||total+buf.length>MAX_TOTAL)throw Error('Size limit');
  const filename=crypto.createHash('sha1').update(url).digest('hex').slice(0,20)+ext(url,type);
  fs.writeFileSync(path.join(assets,filename),buf);
  const local='/assets/'+filename;cache.set(url,local);downloaded++;total+=buf.length;return local;
 }catch(e){failed.push({url,error:String(e.message)});cache.set(url,null);return null}
}
async function rewrite(html,base){
 const tags=html.match(/<img\b[^>]*>/gi)||[];
 for(const tag of [...new Set(tags)]){
  let out=tag;const attrs=[...tag.matchAll(/\b(src|data-src|data-original|data-lazy-src|data-srcset|srcset)\s*=\s*(["'])(.*?)\2/gi)];
  let best=null;
  for(const a of attrs){if(a[1].toLowerCase().includes('srcset'))continue;const val=a[3];if(!val||val.startsWith('data:'))continue;const result=await fetchImage(val,base);if(result){best=result;break}}
  if(!best){
   const ss=attrs.find(a=>a[1].toLowerCase().includes('srcset'));
   if(ss){const candidate=ss[3].split(',')[0].trim().split(/\s+/)[0];best=await fetchImage(candidate,base)}
  }
  if(best){
   out=out.replace(/\s(?:src|data-src|data-original|data-lazy-src|data-srcset|srcset)\s*=\s*(["']).*?\1/gi,'');
   out=out.replace(/<img/i,'<img src="'+best+'" loading="lazy"');
   html=html.replace(tag,out);replaced++;
  }
 }
 const styleUrls=[...new Set([...html.matchAll(/url\(\s*(["']?)([^)"']+)\1\s*\)/gi)].map(m=>m[2]))];
 for(const raw of styleUrls){if(!/\.(png|jpg|jpeg|gif|webp|svg|avif)(\?|$)/i.test(raw))continue;const local=await fetchImage(raw,base);if(local)html=html.split(raw).join(local)}
 return html;
}
(async()=>{
 for(const p of pages){const file=path.join(root,p.html);if(!fs.existsSync(file))continue;let html=fs.readFileSync(file,'utf8');html=await rewrite(html,p.url);fs.writeFileSync(file,html,'utf8');console.log('Assets checked:',p.label||p.url)}
 if(fs.existsSync(path.join(root,'index.html'))){const home=pages.find(p=>new URL(p.url).pathname==='/');if(home)fs.copyFileSync(path.join(root,home.html),path.join(root,'index.html'))}
 fs.writeFileSync(path.join(root,'asset-report.json'),JSON.stringify({downloaded,replaced,bytes:total,failed},null,2));
 console.log('Images downloaded:',downloaded,'image references fixed:',replaced,'failed:',failed.length,'size MB:',(total/1048576).toFixed(1));
})().catch(e=>{console.error(e);process.exitCode=1});
