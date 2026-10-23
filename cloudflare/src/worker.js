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
  if(parts[0]!=='api')return reply({error:'Not found'},404);
  try{
    const admin=parts[1]==='admin';const resource=admin?parts[2]:parts[1];const itemId=admin?parts[3]:parts[2];
    if(admin)await requireAdmin(request,env);
    if(resource==='posts'){
      const id=itemId;
      if(!admin&&!['GET','OPTIONS'].includes(request.method))return reply({error:'Not found'},404);
      if(request.method==='GET'&&!id){
        const limit=Math.min(50,Math.max(1,Number(url.searchParams.get('limit'))||20));
        const page=Math.max(1,Number(url.searchParams.get('page'))||1);
        const cat=url.searchParams.get('category');const month=url.searchParams.get('month');
        const conditions=["status='published'"];const values=[];
        if(cat){conditions.push('category=?');values.push(cat)}
        if(month){conditions.push('issue_month=?');values.push(month)}
        const results=await env.DB.prepare('SELECT id,category,title,insurer,issue_month,cover_key,pdf_key,created_at,updated_at FROM posts WHERE '+conditions.join(' AND ')+' ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(...values,limit,(page-1)*limit).all();
        return reply({items:results.results,page,limit});
      }
      if(request.method==='GET'&&id){
        const row=await env.DB.prepare("SELECT * FROM posts WHERE id=? AND status='published'").bind(id).first();return row?reply(row):reply({error:'Not found'},404);
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
