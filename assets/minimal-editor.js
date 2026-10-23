(function(){
'use strict';
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DRAFT_KEY='instory-editorjs-draft-v1';
window.instoryMinimalWritePage=function(sections){
const options=Object.entries(sections).filter(([k])=>k!=='bookmark').map(([key,section])=>'<option value="'+escapeHTML(key)+'">'+escapeHTML(section.title)+'</option>').join('');
return '<main class="shell content instory-write-page"><form id="instory-write-form" class="instory-write-layout"><div class="instory-write-header"><div class="instory-write-context"><label for="instory-board">게시판</label><select id="instory-board">'+options+'</select></div><span id="instory-save-status" class="instory-save-status" role="status" aria-live="polite">새 문서</span></div><input id="instory-doc-title" maxlength="150" required placeholder="제목을 입력하세요" aria-label="문서 제목" autocomplete="off"><div class="instory-editor-surface"><div id="instory-editorjs" aria-label="본문 편집기"></div></div><div class="instory-write-bottom"><span class="instory-write-footnote">작성 내용은 현재 브라우저에 저장됩니다.</span><div class="instory-write-buttons"><button type="button" id="instory-save">임시저장</button><button type="button" id="instory-preview-btn">미리보기</button><button type="submit" class="instory-submit">게시하기</button></div></div><div id="instory-write-error" role="alert"></div><section id="instory-preview" class="instory-preview" hidden aria-label="문서 미리보기"></section></form></main>'};
window.instoryInitMinimalWrite=function(){
const $=id=>document.getElementById(id);
const holder=$('instory-editorjs'),title=$('instory-doc-title'),board=$('instory-board'),status=$('instory-save-status'),error=$('instory-write-error'),preview=$('instory-preview'),form=$('instory-write-form');
let editor=null,timer=null,fallback=null;
let draft=null;try{draft=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null')}catch{}
if(draft){title.value=draft.title||'';board.value=draft.cat||'products';status.textContent='임시저장된 문서를 불러왔습니다'}
const tools={};
if(typeof Header!=='undefined')tools.header={class:Header,inlineToolbar:true,config:{levels:[2,3,4],defaultLevel:2}};
if(typeof EditorjsList!=='undefined')tools.list={class:EditorjsList,inlineToolbar:true};
if(typeof Quote!=='undefined')tools.quote={class:Quote,inlineToolbar:true};
if(typeof Delimiter!=='undefined')tools.delimiter=Delimiter;
if(typeof ImageTool!=='undefined')tools.image={class:ImageTool,config:{uploader:{uploadByFile:function(file){return new Promise(resolve=>{if(!file||file.size>1500000||!/^image\/(jpeg|png|webp|gif)$/.test(file.type)){error.textContent='이미지는 JPG·PNG·WebP·GIF 형식의 1.5MB 이하 파일만 사용할 수 있습니다.';resolve({success:0});return}const fr=new FileReader();fr.onload=()=>resolve({success:1,file:{url:fr.result}});fr.onerror=()=>resolve({success:0});fr.readAsDataURL(file)})},uploadByUrl:async()=>({success:0})}}};
function blocksToHTML(data){
 const parts=(data.blocks||[]).map(block=>{const d=block.data||{};const t=block.type;
 if(t==='paragraph')return '<p>'+String(d.text||'')+'</p>';
 if(t==='header'){const lv=[2,3,4].includes(Number(d.level))?Number(d.level):2;return '<h'+lv+'>'+String(d.text||'')+'</h'+lv+'>'}
 if(t==='list'){const tag=d.style==='ordered'?'ol':'ul';const items=Array.isArray(d.items)?d.items:[];const render=items.map(item=>'<li>'+(typeof item==='string'?item:String(item.content||''))+'</li>').join('');return '<'+tag+'>'+render+'</'+tag+'>'}
 if(t==='quote')return '<blockquote>'+String(d.text||'')+'</blockquote>';
 if(t==='delimiter')return '<hr>';
 if(t==='image'){const u=String(d.file?.url||'');if(!/^(data:image\/(jpeg|png|webp|gif);base64,|https:\/\/)/i.test(u))return '';return '<figure><img src="'+escapeHTML(u)+'" alt="첨부 이미지">'+(d.caption?'<figcaption>'+String(d.caption)+'</figcaption>':'')+'</figure>'}
 return ''}).join('');
 return typeof window.sanitizeEditor==='function'?window.sanitizeEditor(parts):parts;
}
async function getData(){if(editor){await editor.isReady;return editor.save()}return {blocks:[{type:'paragraph',data:{text:escapeHTML(fallback?.value||'')}}]}}
async function saveDraft(){try{const data=await getData();localStorage.setItem(DRAFT_KEY,JSON.stringify({title:title.value,cat:board.value,data}));status.textContent='자동저장됨';return data}catch(e){status.textContent='저장 실패';error.textContent='브라우저 저장 공간이 부족하거나 차단되어 있습니다.';return null}}
const schedule=()=>{clearTimeout(timer);status.textContent='편집 중';timer=setTimeout(()=>{saveDraft()},800)};
if(typeof EditorJS==='function'){
 try{editor=new EditorJS({holder:'instory-editorjs',autofocus:false,minHeight:250,placeholder:'내용을 입력하세요',inlineToolbar:true,tools,data:draft?.data?.blocks?.length?draft.data:undefined,onChange:schedule,onReady(){status.textContent=draft?'이전 문서 복원됨':'작성 준비'}})}catch(e){editor=null}
}
if(!editor){holder.innerHTML='<textarea class="instory-fallback-editor" aria-label="본문" placeholder="내용을 입력하세요"></textarea>';fallback=holder.querySelector('textarea');fallback.addEventListener('input',schedule);error.textContent='편집기 라이브러리를 불러오지 못해 기본 입력 모드로 전환했습니다.'}
title.addEventListener('input',schedule);board.addEventListener('change',schedule);
$('instory-save').onclick=async()=>{const data=await saveDraft();if(data)status.textContent='임시저장 완료'};
$('instory-preview-btn').onclick=async()=>{error.textContent='';const data=await getData();preview.innerHTML='<h2>'+escapeHTML(title.value||'제목 없음')+'</h2>'+blocksToHTML(data);preview.hidden=false;preview.scrollIntoView({behavior:'smooth',block:'start'})};
form.addEventListener('submit',async e=>{e.preventDefault();error.textContent='';if(!title.value.trim()){title.focus();return}try{const data=await getData();const body=blocksToHTML(data);if(!body.replace(/<[^>]*>/g,'').trim()&&!body.includes('<img')){error.textContent='본문을 작성해 주세요.';return}const entries=JSON.parse(localStorage.getItem('bo-posts')||'[]');const id=Date.now();entries.unshift({id,cat:board.value,title:title.value.trim(),body,html:true,tag:'작성글',date:new Date().toLocaleDateString('ko-KR')});localStorage.setItem('bo-posts',JSON.stringify(entries));localStorage.removeItem(DRAFT_KEY);location.hash='#/post/'+id}catch(e){error.textContent='게시물을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.'}});
};
})();
