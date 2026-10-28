
const $=id=>document.getElementById(id);let current=[];
const routeParts=location.pathname.split('/').filter(Boolean);const requestedCategory=routeParts[1]||new URLSearchParams(location.search).get('category')||'insurance-news';
const validCategories=[...$('category').options].map(x=>x.value);
if(validCategories.includes(requestedCategory))$('category').value=requestedCategory;
const boardNav=$('board-nav');boardNav.innerHTML=[...$('category').options].map((option,i)=>'<a href="/admin/'+encodeURIComponent(option.value)+'" class="'+(option.value===requestedCategory&&routeParts[0]==='admin'?'active':'')+'"><span class="admin-nav-icon" aria-hidden="true">'+['▤','▣','◫','▥','▧','◩','◪','▦','⌁'][i]+'</span>'+option.textContent+'</a>').join('');
const formTemplates={
 'magazines':{title:'소식지 제목',body:'소식지 소개 및 안내',hint:'보험사와 발행연월을 지정하고 표지 이미지·PDF 원본을 등록하세요.',image:'소식지 표지 이미지',pdf:'소식지 PDF 원본',mag:true},
 'insurance-news':{title:'기사 제목',body:'보험소식 본문',hint:'보험업계 소식을 작성합니다. 출처 및 원문 링크를 선택적으로 입력할 수 있습니다.',image:'기사 대표 이미지',pdf:'첨부 PDF (선택)',source:'언론사 / 출처',url:true},
 'finance':{title:'재테크 정보 제목',body:'재테크 정보 본문',hint:'재테크 정보와 참고 출처를 작성합니다.',image:'콘텐츠 이미지 (선택)',pdf:'관련 자료 PDF (선택)',source:'자료 출처',url:true},
 'current':{title:'시사상식 제목',body:'시사상식 본문',hint:'시사 이슈의 배경·핵심내용과 출처를 작성하세요.',image:'본문 대표 이미지 (선택)',pdf:'관련 문서 (선택)',source:'출처',url:true},
 'products':{title:'상품자료 제목',body:'상품 설명 / 변경사항',hint:'보험상품 안내, 약관 등 자료를 등록합니다. PDF 파일 첨부를 권장합니다.',image:'상품 대표 이미지 (선택)',pdf:'상품설명서 · 약관 PDF',source:'보험사 / 제공 기관'},
 'needs':{title:'상담자료 제목',body:'상담자료 설명',hint:'고객 상담에 활용할 자료를 등록하세요. 이미지 또는 PDF 첨부가 가능합니다.',image:'상담 이미지 (선택)',pdf:'상담자료 PDF (선택)'},
 'qa':{title:'제목',body:'내용',hint:'분류를 선택하고 질문을 작성하세요.',image:'이미지 첨부 (선택)',pdf:'첨부파일 (선택)'},
 'resources':{title:'자료 제목',body:'자료 설명',hint:'자료실의 일반 파일과 참고 문서를 등록하세요.',image:'미리보기 이미지 (선택)',pdf:'자료 PDF (선택)',source:'제공 기관 / 출처'},
 'main-links':{title:'링크 이름',body:'링크 설명',hint:'보험 업무에 유용한 웹사이트를 등록합니다. 연결할 HTTPS 주소를 입력하세요.',url:true,image:'아이콘 이미지 (선택)',pdf:'첨부 파일 (선택)',link:true}
};
function adjustFields(){
 const kind=$('category').value;
 const moduleMode=kind==='main-links';
 $('module-fields').hidden=!moduleMode;$('standard-fields').hidden=moduleMode;
 $('title').required=!moduleMode;$('module-insurer').required=moduleMode;
 const config=formTemplates[kind]||formTemplates['insurance-news'];
 $('qa-fields').hidden=kind!=='qa';
 $('mag-only').style.display=config.mag?'grid':'none';
 $('month').required=Boolean(config.mag);
 $('insurer').required=Boolean(config.mag);
 $('title-label').textContent=config.title;
 $('body-label').textContent=config.body;
 $('form-hint').textContent=config.hint;
 $('image-label').firstChild.textContent=config.image;
 $('pdf-label').firstChild.textContent=config.pdf;
 $('source-field').hidden=!config.source;
 $('url-field').hidden=!config.url;
 $('extra-fields').hidden=!(config.source||config.url);
 $('source-label').firstChild.textContent=config.source||'출처';
 $('reference-url').required=Boolean(config.link);
 document.querySelector('h1').textContent=$('category').selectedOptions[0].textContent+' 등록';
 document.title='INSTORY · '+$('category').selectedOptions[0].textContent+' 등록';
}
$('category').addEventListener('change',()=>{adjustFields();boardNav.querySelectorAll('a').forEach(a=>a.classList.toggle('active',new URL(a.href).pathname.split('/')[2]===$('category').value));load()});
adjustFields();

const editor=$('rich-editor');
let toastEditor=null;
if(window.toastui?.Editor){
 toastEditor=new toastui.Editor({el:editor,height:'490px',initialEditType:'wysiwyg',previewStyle:'tab',language:'ko-KR',usageStatistics:false,
 toolbarItems:[['heading','bold','italic','strike'],['hr','quote'],['ul','ol','task'],['table','image','link'],['code','codeblock']],
 hooks:{addImageBlobHook:async function(blob,callback){try{msg('이미지 업로드 중...');const key=await upload(blob);callback('https://instory-content-api.porom.workers.dev/api/files/'+key,blob.name||'본문 이미지');msg('이미지가 등록되었습니다.')}catch(e){msg('이미지 업로드 실패: '+e.message)}return false;}}});
 toastEditor.on('change',()=>{$('body').value=toastEditor.getHTML()});
}else{editor.setAttribute('contenteditable','true');editor.className='rich-editor';msg('TOAST UI 에디터 로딩 실패. 페이지를 새로고침하세요.')}
const getEditorHtml=()=>toastEditor?toastEditor.getHTML():editor.innerHTML;
const setEditorHtml=html=>{if(toastEditor)toastEditor.setHTML(html||'');else editor.innerHTML=html||''};
const base=()=>location.origin;
const call=async(path,opts={})=>{let r;try{r=await fetch(base()+path,{credentials:'include',...opts})}catch{throw Error('API 연결에 실패했습니다. Cloudflare Worker의 /admin 주소에서 관리자 페이지를 열어 주세요.')}let j;try{j=await r.json()}catch{throw Error('서버에 접근할 수 없습니다. 관리자 인증 또는 CORS 설정을 확인하세요.')}if(!r.ok)throw Error(j.error||'요청 실패');return j};
function msg(t){$('status').textContent=t}
async function upload(file){if(!file)return null;const fd=new FormData();fd.append('file',file);const r=await call('/admin/api/files',{method:'POST',body:fd});return r.key}
function clear(){ $('module-insurer').value='';$('module-kind').value='';$('module-link').value='';$('module-description').value='';setEditorHtml('');$('form').reset();if(requestedCategory&&validCategories.includes(requestedCategory))$('category').value=requestedCategory;adjustFields();$('id').value='';$('cover-key').textContent='';$('pdf-key').textContent='';$('submit').textContent='등록';msg('')}
$('clear').onclick=clear;
$('load').onclick=load;
async function load(){try{const out=await call('/admin/api/posts?limit=50&category='+encodeURIComponent($('category').value));current=out.items||[];const el=$('list');el.replaceChildren();if(!current.length){el.textContent='등록된 글이 없습니다.';return}for(const p of current){const a=document.createElement('article');const info=document.createElement('span');info.textContent=p.title+' · '+p.category+' · '+(p.issue_month||'');const acts=document.createElement('span');const edit=document.createElement('button');edit.textContent='수정';edit.onclick=async()=>{try{const x=await call('/admin/api/posts/'+encodeURIComponent(p.id));$('id').value=x.id;$('category').value=x.category;$('title').value=x.category==='qa'?x.title.slice(x.title.indexOf(']')+1).trimStart():x.title;if(x.category==='qa'){const close=x.title.indexOf(']');if(x.title.startsWith('[')&&close>1){const kind=x.title.slice(1,close);if([...$('qa-kind').options].some(o=>o.value===kind))$('qa-kind').value=kind}}$('body').value=x.content_html;setEditorHtml(x.content_html||'');$('insurer').value=x.insurer;$('month').value=x.issue_month?x.issue_month.replace('.','-'):'';$('visibility').value=x.status;$('cover-key').textContent=x.cover_key||'';$('pdf-key').textContent=x.pdf_key||'';$('submit').textContent='수정';if(x.category==='main-links'&&x.content_html.startsWith('INSTORY_MODULE:')){try{const m=JSON.parse(x.content_html.slice(15));$('module-type').value=m.module;$('module-insurer').value=m.insurer;$('module-kind').value=m.kind;$('module-link').value=m.url;$('module-description').value=m.description}catch(e){}}adjustFields();window.scrollTo({top:0,behavior:'smooth'})}catch(e){alert(e.message)}};const del=document.createElement('button');del.textContent='삭제';del.style.background='#fff';del.onclick=async()=>{if(!confirm('선택한 게시글을 삭제할까요?'))return;try{await call('/admin/api/posts/'+encodeURIComponent(p.id),{method:'DELETE'});await load()}catch(e){alert(e.message)}};const view=document.createElement('button');view.type='button';view.textContent='보기';view.onclick=()=>showManagerPreview(p.id);acts.append(view,document.createTextNode(' '),edit,document.createTextNode(' '),del);a.append(info,acts);el.append(a)}}catch(e){msg(e.message)}}
$('form').onsubmit=async e=>{e.preventDefault();$('submit').disabled=true;msg('저장 중...');try{const imageKey=$('category').value==='main-links'?null:$('cover-key').textContent||await upload($('cover').files[0])||null;const pdfKey=$('category').value==='main-links'?null:await upload($('pdf').files[0])||$('pdf-key').textContent||null;const m=$('month').value;
 const referenceUrl=$('reference-url').value.trim(),referenceSource=$('reference-source').value.trim();
 if(referenceUrl&&!/^https:\/\//i.test(referenceUrl))throw Error('연결 주소는 https://로 시작해야 합니다.');
 const sourceTag=referenceSource?'<p><strong>출처:</strong> '+referenceSource.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))+'</p>':'';
 const linkTag=referenceUrl?'<p><a href="'+referenceUrl.replace(/"/g,'&quot;')+'" target="_blank" rel="noopener noreferrer">원문 / 관련 사이트 바로가기 ↗</a></p>':'';
 $('body').value=sourceTag+linkTag+getEditorHtml();
 const isModule=$('category').value==='main-links';
 const moduleData=isModule?{module:Number($('module-type').value),insurer:$('module-insurer').value.trim(),kind:$('module-kind').value.trim(),url:$('module-link').value.trim(),description:$('module-description').value.trim()}:null;
 if(isModule&&moduleData.url&&!/^https:\/\//i.test(moduleData.url))throw Error('연결 주소는 https://로 시작해야 합니다.');
 const data={category:$('category').value,status:$('visibility').value,title:isModule?moduleData.insurer:($('category').value==='qa'?'['+$('qa-kind').value+'] ':'')+$('title').value.trim(),insurer:$('category').value==='magazines'?$('insurer').value.trim():'',issue_month:$('category').value==='magazines'&&m?m.replace('-','.'):null,content_html:isModule?'INSTORY_MODULE:'+JSON.stringify(moduleData):$('body').value,cover_key:imageKey,pdf_key:pdfKey};const id=$('id').value;await call('/admin/api/posts'+(id?'/'+encodeURIComponent(id):''),{method:id?'PUT':'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});clear();await load();msg('DB에 저장되었습니다.')}catch(e){msg('저장 실패: '+e.message)}finally{$('submit').disabled=false}};

/* Open the requested article from the site's administrator-only actions. */
(async function(){
 const query=new URLSearchParams(location.search);
 const editId=query.get('edit')||(routeParts.length===4&&routeParts[3]==='edit'?routeParts[2]:null),deleteId=query.get('delete'),viewId=routeParts.length===3&&/^[0-9]+$/.test(routeParts[2])?routeParts[2]:null,target=editId||deleteId||viewId;
 await load();
 if(!target)return;
 const idx=current.findIndex(p=>String(p.id)===target);
 if(idx<0){msg('선택한 글을 현재 게시판 목록에서 찾을 수 없습니다.');return}
 const row=$('list').children[idx];
 const actions=row&&row.querySelectorAll('button');
 if(!actions||actions.length<3)return;
 if(deleteId){actions[2].click()}else if(editId){await actions[1].click()}else{actions[0].click()}
})();

/* Authenticated article detail preview, with edit and delete actions. */
async function showManagerPreview(id){
 try{
  const post=await call('/admin/api/posts/'+encodeURIComponent(id));
  let view=$('manager-view');
  if(!view){view=document.createElement('section');view.id='manager-view';view.className='panel';$('form').before(view)}
  view.replaceChildren();
  const heading=document.createElement('h2');heading.textContent=post.category==='main-links'?'메인 링크 상세보기':'게시글 상세보기';
  const title=document.createElement('h3');title.textContent=post.title||'제목 없음';
  const meta=document.createElement('p');meta.textContent=(post.category||'')+' · '+(post.issue_month||'')+' · '+(post.status==='published'?'게시':'임시저장');
  const actions=document.createElement('div');actions.className='preview-actions';
  const back=document.createElement('button');back.textContent='목록';back.type='button';back.onclick=()=>{view.remove();$('form').hidden=false;$('form').style.display='';};
  const edit=document.createElement('button');edit.textContent='수정';edit.type='button';edit.onclick=()=>{view.remove();$('form').hidden=false;$('form').style.display='';const index=current.findIndex(p=>String(p.id)===String(id));if(index>=0){const row=$('list').children[index];const buttons=row&&row.querySelectorAll('button');if(buttons&&buttons[1])buttons[1].click()}};
  const del=document.createElement('button');del.textContent='삭제';del.type='button';del.onclick=async()=>{if(!confirm('선택한 게시글을 삭제할까요?'))return;try{await call('/admin/api/posts/'+encodeURIComponent(id),{method:'DELETE'});view.remove();$('form').hidden=false;$('form').style.display='';await load()}catch(e){alert(e.message)}};
  actions.append(back,edit,del);
  const frame=document.createElement('iframe');frame.title='게시글 본문 미리보기';frame.setAttribute('sandbox','');frame.style.cssText='width:100%;height:520px;border:1px solid #e5e5e5;background:#fff;margin-top:16px';
  const body=String(post.content_html||'');const content=body.startsWith('INSTORY_MODULE:')?'<pre style="white-space:pre-wrap">'+body.replaceAll('&','&amp;').replaceAll('<','&lt;')+'</pre>':body;
  frame.srcdoc='<!doctype html><html lang="ko"><meta charset="utf-8"><body>'+content+'</body></html>';
  view.append(heading,title,meta,actions,frame);
  const attachments=document.createElement('div');attachments.className='preview-attachments';
  for(const item of [['표지 이미지',post.cover_key],['첨부 PDF',post.pdf_key]]){if(item[1]){const link=document.createElement('a');link.textContent=item[0]+' 열기';link.href='https://instory-content-api.porom.workers.dev/api/files/'+encodeURIComponent(item[1]);link.target='_blank';link.rel='noopener noreferrer';link.style.cssText='display:inline-block;margin:15px 16px 0 0;color:#555';attachments.append(link)}}
  view.append(attachments);$('form').hidden=true;$('form').style.display='none';view.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){alert('상세보기 실패: '+e.message)}
}

/* Master administration: inventory and dashboard. Unconnected sections are explicitly marked, never presented as editable. */
(function setupMasterNavigation(){
 const route=location.pathname.split('/').filter(Boolean);
 const isHome=route.length===1;
 const isMaster=route[1]==='master';
 if(!isHome&&!isMaster)return;
 const workspace=document.querySelector('.admin-workspace');
 const dashboard=document.getElementById('master-dashboard');
 if(!workspace||!dashboard)return;
 [...workspace.children].forEach(node=>{if(node!==dashboard)node.style.display='none'});
 dashboard.hidden=false;
 const heading=document.querySelector('main>h1');
 if(heading)heading.textContent=isHome?'마스터 대시보드':'마스터 관리';
 const subtitle=document.querySelector('main>.admin-status');if(subtitle)subtitle.textContent='INSTORY 운영 현황 및 관리 항목';
 const masterSections={
  insurers:{title:'보험사 정보',description:'보험사 44개 및 탭별 업무정보',status:'관리 API 연결 필요'},
  bookmarks:{title:'보험 북마크',description:'보험사·업무별 공식 링크 관리',status:'전용 DB 관리 기능 준비 필요'},
  site:{title:'사이트 구성',description:'메인 배너, 로고, 메뉴, 푸터',status:'사이트 설정 저장소 연결 필요'},
  system:{title:'운영 및 권한',description:'계정·접근 권한·파일 관리',status:'인증 및 권한 API 확장 필요'}
 };
 const title=document.createElement('h2');title.textContent=isHome?'관리 항목':' '+(masterSections[route[2]]?.title||'마스터 관리');dashboard.append(title);
 if(isMaster){
  const current=masterSections[route[2]];
  const info=document.createElement('div');info.className='master-info';
  const desc=document.createElement('p');desc.textContent=current?.description||'관리 영역을 선택하세요.';
  const state=document.createElement('p');state.textContent=current?.status||'현재 연결된 기능이 없습니다.';state.className='master-state';
  const back=document.createElement('a');back.href='/admin';back.textContent='← 대시보드로';
  info.append(desc,state,back);dashboard.append(info);
  document.querySelectorAll('.master-nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')===location.pathname));
 }else{
  const area=document.createElement('div');area.className='master-card-grid';
  const sections=[...document.querySelectorAll('#category option')].map(o=>({title:o.textContent,description:'게시글 등록 · 보기 · 수정 · 삭제',href:'/admin/'+o.value,ready:true}));
  sections.push(...Object.entries(masterSections).map(([key,item])=>({title:item.title,description:item.description,href:'/admin/master/'+key,ready:false})));
  for(const item of sections){const card=document.createElement('a');card.className='master-card';card.href=item.href;const h=document.createElement('strong');h.textContent=item.title;const p=document.createElement('p');p.textContent=item.description;const tag=document.createElement('small');tag.textContent=item.ready?'콘텐츠 관리':'확장 예정';card.append(h,p,tag);area.append(card)}
  dashboard.append(area);
 }
})();
