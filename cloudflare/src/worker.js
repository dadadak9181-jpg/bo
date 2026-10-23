const ADMIN_PAGE="<!doctype html><html lang=\"ko\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>INSTORY 콘텐츠 관리</title><style>*{box-sizing:border-box}body{font-family:Pretendard,system-ui,sans-serif;color:#19354b;margin:0;background:#f5f7fa}main{max-width:980px;margin:50px auto;padding:0 20px}h1{font-size:28px}p{color:#678}form,.panel{background:white;border:1px solid #dde5ed;padding:25px;border-radius:12px;margin:20px 0}label{display:block;font-size:13px;font-weight:700;margin:14px 0 5px}input,select,textarea{width:100%;padding:12px;border:1px solid #ced9e3;border-radius:6px;font:inherit}textarea{min-height:220px;resize:vertical}button{border:0;border-radius:6px;background:#215a84;color:white;padding:12px 18px;font-weight:700;cursor:pointer}button:disabled{opacity:.6}.row{display:grid;grid-template-columns:1fr 1fr;gap:15px}.actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.muted{color:#748493;font-size:12px}#status{font-size:13px;white-space:pre-wrap}article{border-top:1px solid #e1e9ee;padding:15px 0;display:flex;justify-content:space-between;gap:16px}article button{font-size:12px;padding:6px 11px;background:#687d8b}@media(max-width:650px){.row{grid-template-columns:1fr}}.editor-toolbar{display:flex;gap:5px;align-items:center;padding:8px;border:1px solid #ccd8e4;border-bottom:0;border-radius:7px 7px 0 0;background:#f8fafc;flex-wrap:wrap}.editor-toolbar button{padding:6px 10px;background:#fff;color:#1c405c;border:1px solid #d8e1e9;border-radius:4px;font-size:13px}.rich-editor{min-height:320px;border:1px solid #ccd8e4;border-radius:0 0 7px 7px;padding:18px;outline:none;background:#fff;line-height:1.75;overflow-wrap:anywhere}.rich-editor:empty:before{content:'본문 내용을 입력하세요';color:#91a0ae}.rich-editor img{max-width:100%}.rich-editor:focus{border-color:#3d82cc}.mag-only{display:none}#form>label,#form>.row{margin-bottom:12px}.section-title{font-size:15px;font-weight:750;margin:10px 0 18px;color:#1e425e}.admin-board-nav{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0}.admin-board-nav a{background:#fff;border:1px solid #d6e2ec;color:#2b4761;border-radius:7px;padding:10px 12px;font-size:13px;font-weight:700;text-decoration:none}.admin-board-nav a.active{background:#225d88;border-color:#225d88;color:#fff}.admin-head{margin-bottom:16px}.admin-head h1{margin-bottom:6px}.admin-status{font-size:13px;color:#60768a}.admin-board-nav a:hover{border-color:#3373a3}#api-panel{display:none}</style></head><body><main><h1>INSTORY 콘텐츠 관리</h1><p class=\"admin-status\">게시판을 선택한 뒤 글을 등록하거나 기존 글을 관리하세요.</p><nav id=\"board-nav\" class=\"admin-board-nav\" aria-label=\"관리할 게시판\"></nav><div class=\"panel\" id=\"api-panel\"><label>Cloudflare API 주소<input id=\"api\" type=\"url\" value=\"https://instory-content-api.porom.workers.dev\"></label><p class=\"muted\">Cloudflare Worker 배포 후 주소를 입력합니다. 외부 사이트에서 등록이 실패한다면 Worker의 /admin 주소로 접속해 주세요. 관리자는 Cloudflare Access 인증이 필요합니다.</p><a id=\"login\" href=\"/api/admin/editor\" target=\"_blank\" rel=\"noopener\" style=\"display:inline-block;margin-right:12px;color:#215a84\">① 관리자 로그인</a><button id=\"load\" type=\"button\">② 등록 글 조회</button></div><form id=\"form\"><input id=\"id\" type=\"hidden\"><div class=\"row\"><div><label>게시판<select id=\"category\"><option value=\"magazines\">월별 소식지</option><option value=\"insurance-news\">오늘의 보험소식</option><option value=\"finance\">오늘의 재테크상식</option><option value=\"current\">오늘의 시사상식</option><option value=\"products\">상품 자료실</option><option value=\"needs\">상담 자료</option><option value=\"qa\">질문과 답변</option><option value=\"resources\">기타 자료실</option><option value=\"main-links\">메인 모음 링크</option></select></label></div><div><label>공개 상태<select id=\"visibility\"><option value=\"published\">게시</option><option value=\"draft\">임시저장</option></select></label></div></div><label>제목<input id=\"title\" required maxlength=\"180\"></label><div class=\"row mag-only\" id=\"mag-only\"><div><label>보험사명<input id=\"insurer\" maxlength=\"100\"></label></div><div><label>발행연월<input id=\"month\" type=\"month\" value=\"2026-10\"></label></div></div><label>본문</label><div class=\"editor-toolbar\" id=\"editor-toolbar\"><button type=\"button\" data-command=\"bold\"><b>굵게</b></button><button type=\"button\" data-command=\"italic\"><i>기울임</i></button><button type=\"button\" data-command=\"insertUnorderedList\">목록</button><button type=\"button\" data-command=\"insertOrderedList\">번호 목록</button><button type=\"button\" id=\"add-link\">링크</button><button type=\"button\" id=\"add-image\">이미지 삽입</button></div><div class=\"rich-editor\" id=\"rich-editor\" contenteditable=\"true\" role=\"textbox\" aria-multiline=\"true\" aria-label=\"본문 편집기\"></div><input id=\"body\" type=\"hidden\"><div class=\"row\"><div><label>대표 이미지 (JPG / PNG / WebP)<input id=\"cover\" type=\"file\" accept=\".jpg,.jpeg,.png,.webp\"></label><small id=\"cover-key\" class=\"muted\"></small></div><div><label>첨부 PDF<input id=\"pdf\" type=\"file\" accept=\".pdf,application/pdf\"></label><small id=\"pdf-key\" class=\"muted\"></small></div></div><div class=\"actions\" style=\"margin-top:24px\"><button id=\"submit\" type=\"submit\">글 등록</button><button id=\"clear\" type=\"button\" style=\"background:#778997\">새 글 작성</button><span id=\"status\" role=\"status\"></span></div></form><section class=\"panel\"><h2>등록 글</h2><div id=\"list\">API 연결 후 조회할 수 있습니다.</div></section></main><script>\nconst $=id=>document.getElementById(id);let current=[];\nconst requestedCategory=new URLSearchParams(location.search).get('category')||'insurance-news';\nconst validCategories=[...$('category').options].map(x=>x.value);\nif(validCategories.includes(requestedCategory))$('category').value=requestedCategory;\nconst boardNav=$('board-nav');boardNav.innerHTML=[...$('category').options].map(option=>'<a href=\"/api/admin/editor?category='+encodeURIComponent(option.value)+'\" class=\"'+(option.value===requestedCategory?'active':'')+'\">'+option.textContent+'</a>').join('');\nfunction adjustFields(){\n const isMagazine=$('category').value==='magazines';\n $('mag-only').style.display=isMagazine?'grid':'none';\n $('month').required=isMagazine;\n $('insurer').required=isMagazine;\n document.querySelector('h1').textContent=isMagazine?'월별 소식지 등록':$('category').selectedOptions[0].textContent+' 글쓰기';\n}\n$('category').addEventListener('change',()=>{adjustFields();boardNav.querySelectorAll('a').forEach(a=>a.classList.toggle('active',new URL(a.href).searchParams.get('category')===$('category').value));load()});\nadjustFields();\n\nconst editor=$('rich-editor');\n$('editor-toolbar').addEventListener('click',async e=>{const b=e.target.closest('[data-command]');if(!b)return;editor.focus();document.execCommand(b.dataset.command,false,null)});\n$('add-link').onclick=()=>{const url=prompt('연결할 링크 주소 (https://)');if(url&&/^https:\\/\\//i.test(url)){editor.focus();document.execCommand('createLink',false,url)}};\n$('add-image').onclick=()=>{$('cover').click()};\nconst base=()=>{const x=(location.hostname.endsWith('.workers.dev')?location.origin:$('api').value.trim()).replace(/\\/$/,'');if(!/^https:\\/\\/[^/]+$/.test(x))throw Error('Cloudflare Worker HTTPS 주소를 입력하세요.');return x};\nconst call=async(path,opts={})=>{let r;try{r=await fetch(base()+path,{credentials:'include',...opts})}catch{throw Error('API 연결에 실패했습니다. Cloudflare Worker의 /admin 주소에서 관리자 페이지를 열어 주세요.')}let j;try{j=await r.json()}catch{throw Error('서버에 접근할 수 없습니다. 관리자 인증 또는 CORS 설정을 확인하세요.')}if(!r.ok)throw Error(j.error||'요청 실패');return j};\nfunction msg(t){$('status').textContent=t}\nasync function upload(file){if(!file)return null;const fd=new FormData();fd.append('file',file);const r=await call('/api/admin/files',{method:'POST',body:fd});return r.key}\nfunction clear(){ editor.innerHTML='';$('form').reset();if(requestedCategory&&validCategories.includes(requestedCategory))$('category').value=requestedCategory;adjustFields();$('id').value='';$('cover-key').textContent='';$('pdf-key').textContent='';$('submit').textContent='글 등록';msg('')}\n$('clear').onclick=clear;\n$('load').onclick=load;\nasync function load(){try{const out=await call('/api/admin/posts?limit=50&category='+encodeURIComponent($('category').value));current=out.items||[];const el=$('list');el.replaceChildren();if(!current.length){el.textContent='등록된 글이 없습니다.';return}for(const p of current){const a=document.createElement('article');const info=document.createElement('span');info.textContent=p.title+' · '+p.category+' · '+(p.issue_month||'');const acts=document.createElement('span');const edit=document.createElement('button');edit.textContent='수정';edit.onclick=async()=>{try{const x=await call('/api/admin/posts/'+encodeURIComponent(p.id));$('id').value=x.id;$('category').value=x.category;$('title').value=x.title;$('body').value=x.content_html;editor.innerHTML=x.content_html||'';$('insurer').value=x.insurer;$('month').value=x.issue_month?x.issue_month.replace('.','-'):'';$('visibility').value=x.status;$('cover-key').textContent=x.cover_key||'';$('pdf-key').textContent=x.pdf_key||'';$('submit').textContent='수정 저장';adjustFields();window.scrollTo({top:0,behavior:'smooth'})}catch(e){alert(e.message)}};const del=document.createElement('button');del.textContent='삭제';del.style.background='#a84e4e';del.onclick=async()=>{if(!confirm('선택한 게시글을 삭제할까요?'))return;try{await call('/api/admin/posts/'+encodeURIComponent(p.id),{method:'DELETE'});await load()}catch(e){alert(e.message)}};acts.append(edit,document.createTextNode(' '),del);a.append(info,acts);el.append(a)}}catch(e){msg(e.message)}}\n$('form').onsubmit=async e=>{e.preventDefault();$('submit').disabled=true;msg('저장 중...');try{const imageKey=await upload($('cover').files[0])||$('cover-key').textContent||null;const pdfKey=await upload($('pdf').files[0])||$('pdf-key').textContent||null;const m=$('month').value;$('body').value=editor.innerHTML;const data={category:$('category').value,status:$('visibility').value,title:$('title').value.trim(),insurer:$('category').value==='magazines'?$('insurer').value.trim():'',issue_month:$('category').value==='magazines'&&m?m.replace('-','.'):null,content_html:$('body').value,cover_key:imageKey,pdf_key:pdfKey};const id=$('id').value;await call('/api/admin/posts'+(id?'/'+encodeURIComponent(id):''),{method:id?'PUT':'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});clear();await load();msg('DB에 저장되었습니다.')}catch(e){msg('저장 실패: '+e.message)}finally{$('submit').disabled=false}};\n</script></body></html>";
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8',...headers}});
const fail=(message,status=400)=>json({error:message},status);
function cors(req,env){const origin=req.headers.get('Origin');return origin && origin===env.ALLOWED_ORIGIN?{'access-control-allow-origin':origin,'access-control-allow-methods':'GET,POST,PUT,DELETE,OPTIONS','access-control-allow-headers':'Content-Type,CF-Access-Jwt-Assertion','vary':'Origin'}:{}}
const encode=s=>new TextEncoder().encode(s);
const fromB64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'=')),c=>c.charCodeAt(0));
let keysCache;
async function requireAdmin(request,env){
  if(!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD)throw {status:503,message:'Admin authentication not configured'};
  const token=request.headers.get('Cf-Access-Jwt-Assertion');
  if(!token)throw {status:401,message:'Administrator authentication required'};
  const parts=token.split('.');if(parts.length!==3)throw {status:401,message:'Malformed token'};
  let header,payload;
  try{header=JSON.parse(new TextDecoder().decode(fromB64(parts[0])));payload=JSON.parse(new TextDecoder().decode(fromB64(parts[1])))}catch{throw {status:401,message:'Malformed token'}}
  if(header.alg!=='RS256'||!header.kid)throw {status:401,message:'Unsupported token'};
  const domain=env.ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//,'').replace(/\/$/,'');
  const issuer='https://'+domain;
  const now=Math.floor(Date.now()/1000);
  if(payload.iss!==issuer||!(Array.isArray(payload.aud)?payload.aud.includes(env.ACCESS_AUD):payload.aud===env.ACCESS_AUD)||!payload.exp||now>=payload.exp||(!payload.nbf?false:now<payload.nbf))throw {status:403,message:'Invalid Access claims'};
  if(!keysCache||keysCache.exp<Date.now()){
    const response=await fetch(issuer+'/cdn-cgi/access/certs');if(!response.ok)throw {status:503,message:'Cannot verify administrator'};
    keysCache={data:await response.json(),exp:Date.now()+300000};
  }
  const jwk=keysCache.data.keys?.find(k=>k.kid===header.kid);
  if(!jwk)throw {status:401,message:'Unknown signing key'};
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,fromB64(parts[2]),encode(parts[0]+'.'+parts[1]));
  if(!valid)throw {status:401,message:'Invalid signature'};
  return payload.email||payload.sub;
}
const categories=new Set(['magazines','insurance-news','finance','current','products','needs','qa','resources','main-links']);
function normalize(input){if(!input||typeof input!=='object')throw {status:400,message:'Invalid JSON'};
  const post={category:String(input.category||'').trim(),title:String(input.title||'').trim(),content_html:String(input.content_html||''),insurer:String(input.insurer||''),issue_month:input.issue_month||null,cover_key:input.cover_key||null,pdf_key:input.pdf_key||null,status:input.status||'published'};
  if(!categories.has(post.category)||!post.title||post.title.length>180||post.content_html.length>300000||post.insurer.length>100||!['published','draft'].includes(post.status))throw {status:400,message:'Invalid post fields'};
  if(post.issue_month&&!/^\d{4}\.(0[1-9]|1[0-2])$/.test(post.issue_month))throw {status:400,message:'Invalid issue month'};
  for(const k of ['cover_key','pdf_key'])if(post[k]&&(typeof post[k]!=='string'||!/^uploads\/[a-f0-9-]{36}\.[a-z0-9]{2,5}$/.test(post[k])))throw {status:400,message:'Invalid file reference'};
  return post;
}
export default {async fetch(request,env){
  const h=cors(request,env);const url=new URL(request.url);const parts=url.pathname.split('/').filter(Boolean);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:h});
  const reply=(body,status=200)=>json(body,status,h);
  if(url.pathname==='/admin'||url.pathname==='/admin/')return Response.redirect(new URL('/api/admin/editor'+url.search,url),302);
  if(parts[0]!=='api')return reply({error:'Not found'},404);
  try{
    const admin=parts[1]==='admin';const resource=admin?parts[2]:parts[1];const itemId=admin?parts[3]:parts[2];
    if(admin)await requireAdmin(request,env);
    if(admin&&resource==='editor'&&request.method==='GET')return new Response(ADMIN_PAGE,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
    if(admin&&resource==='editor'&&request.method==='GET'){
      return new Response(ADMIN_PAGE,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; form-action 'self'; base-uri 'none'"}});
    }
    if(resource==='posts'){
      const id=itemId;
      if(!admin&&!['GET','OPTIONS'].includes(request.method))return reply({error:'Not found'},404);
      if(request.method==='GET'&&!id){
        const limit=Math.min(50,Math.max(1,Number(url.searchParams.get('limit'))||20));
        const page=Math.max(1,Number(url.searchParams.get('page'))||1);
        const cat=url.searchParams.get('category');const month=url.searchParams.get('month');
        const conditions=admin?[]:["status='published'"];const values=[];
        if(cat){conditions.push('category=?');values.push(cat)}
        if(month){conditions.push('issue_month=?');values.push(month)}
        const results=await env.DB.prepare('SELECT id,category,title,insurer,issue_month,cover_key,pdf_key,created_at,updated_at FROM posts '+(conditions.length?'WHERE '+conditions.join(' AND ')+' ':'')+'ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(...values,limit,(page-1)*limit).all();
        return reply({items:results.results,page,limit});
      }
      if(request.method==='GET'&&id){
        const row=await env.DB.prepare(admin?'SELECT * FROM posts WHERE id=?':"SELECT * FROM posts WHERE id=? AND status='published'").bind(id).first();return row?reply(row):reply({error:'Not found'},404);
      }
      if(request.method==='POST'&&!id&&admin){
        const p=normalize(await request.json());const uuid=crypto.randomUUID();
        await env.DB.prepare('INSERT INTO posts(id,category,title,content_html,insurer,issue_month,cover_key,pdf_key,status) VALUES(?,?,?,?,?,?,?,?,?)').bind(uuid,p.category,p.title,p.content_html,p.insurer,p.issue_month,p.cover_key,p.pdf_key,p.status).run();
        return reply({id:uuid},201);
      }
      if(request.method==='PUT'&&id&&admin){
        const p=normalize(await request.json());
        const res=await env.DB.prepare("UPDATE posts SET category=?,title=?,content_html=?,insurer=?,issue_month=?,cover_key=?,pdf_key=?,status=?,updated_at=datetime('now') WHERE id=?").bind(p.category,p.title,p.content_html,p.insurer,p.issue_month,p.cover_key,p.pdf_key,p.status,id).run();
        return res.meta.changes?reply({id}):reply({error:'Not found'},404);
      }
      if(request.method==='DELETE'&&id&&admin){
        const res=await env.DB.prepare('DELETE FROM posts WHERE id=?').bind(id).run();
        return res.meta.changes?reply({deleted:true}):reply({error:'Not found'},404);
      }
    }
    if(resource==='files'){
      if(!admin&&!['GET','OPTIONS'].includes(request.method))return reply({error:'Not found'},404);
      const key=parts.slice(admin?3:2).join('/');
      if(request.method==='POST'&&admin&&parts.length===3){
        const fd=await request.formData();const file=fd.get('file');
        if(!(file instanceof File))return reply({error:'Missing file'},400);
        const types={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
        const ext=types[file.type];if(!ext||file.size>15*1024*1024||file.size===0)return reply({error:'PDF/JPEG/PNG/WebP only, maximum 15MB'},400);
        const id=crypto.randomUUID(),key='uploads/'+id+'.'+ext;
        await env.FILES.put(key,file.stream(),{httpMetadata:{contentType:file.type,contentDisposition:ext==='pdf'?'attachment; filename="document.pdf"':'inline'}});
        await env.DB.prepare('INSERT INTO attachments(id,object_key,file_name,mime_type,size_bytes) VALUES(?,?,?,?,?)').bind(id,key,String(file.name).slice(0,200),file.type,file.size).run();
        return reply({key,url:'/api/files/'+key},201);
      }
      if(request.method==='GET'&&key){
        if(!/^uploads\/[a-f0-9-]{36}\.(pdf|jpg|png|webp)$/.test(key))return reply({error:'Not found'},404);
        const allowed=await env.DB.prepare("SELECT 1 FROM posts WHERE status='published' AND (cover_key=? OR pdf_key=?) LIMIT 1").bind(key,key).first();
        if(!allowed)return reply({error:'Not found'},404);
        const obj=await env.FILES.get(key);if(!obj)return reply({error:'Not found'},404);
        const heads=new Headers(h);heads.set('Content-Type',obj.httpMetadata?.contentType||'application/octet-stream');heads.set('Content-Disposition',key.endsWith('.pdf')?'attachment; filename="document.pdf"':'inline');heads.set('Cache-Control','public, max-age=3600');heads.set('X-Content-Type-Options','nosniff');
        return new Response(obj.body,{headers:heads});
      }
    }
    return reply({error:'Not found'},404);
  }catch(e){const status=e.status||500;return reply({error:status===500?'Server error':e.message},status)}
}};
