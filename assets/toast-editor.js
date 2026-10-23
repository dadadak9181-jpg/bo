(function(){
'use strict';
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key='instory-toastui-draft-v1';
window.instoryMinimalWritePage=function(sections){
 const boards=Object.entries(sections).filter(([id])=>id!=='bookmark'&&id!=='qa').map(([id,v])=>'<option value="'+esc(id)+'">'+esc(v.title)+'</option>').join('');
 return '<main class="shell content instory-write-page"><form id="instory-write-form" class="instory-write-layout"><div class="instory-write-header"><div class="instory-write-context"><label for="instory-board">게시판</label><select id="instory-board">'+boards+'</select></div><span id="instory-save-status" class="instory-save-status" role="status" aria-live="polite">새 문서</span></div><input id="instory-doc-title" maxlength="150" required placeholder="제목을 입력하세요" aria-label="문서 제목" autocomplete="off"><div class="instory-editor-surface"><div id="instory-editorjs" aria-label="본문 편집기"></div></div><div class="instory-write-bottom"><span class="instory-write-footnote">작성 내용은 현재 브라우저에 저장됩니다.</span><div class="instory-write-buttons"><button type="button" id="instory-save">임시저장</button><button type="button" id="instory-preview-btn">미리보기</button><button type="submit" class="instory-submit">게시하기</button></div></div><p id="instory-write-error" role="alert"></p><section id="instory-preview" class="instory-preview" hidden aria-label="문서 미리보기"></section></form></main>';
};
window.instoryInitMinimalWrite=function(){
 const $=id=>document.getElementById(id);
 const title=$('instory-doc-title'),board=$('instory-board'),status=$('instory-save-status'),error=$('instory-write-error'),preview=$('instory-preview'),el=$('instory-editorjs');
 let draft=null,editor=null,timer;
 try{draft=JSON.parse(localStorage.getItem(key)||'null')}catch{}
 if(draft){title.value=draft.title||'';board.value=draft.cat||'products'}
 if(!window.toastui||!window.toastui.Editor){
   error.textContent='TOAST UI Editor를 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침해 주세요.';
   el.innerHTML='<p class="editor-load-error">편집기를 불러오지 못했습니다.</p>';return;
 }
 editor=new toastui.Editor({
   el,height:'560px',initialEditType:'wysiwyg',previewStyle:'tab',
   language:'ko-KR',usageStatistics:false,
   initialValue:draft?.markdown||'',
   toolbarItems:[
     ['heading','bold','italic','strike'],
     ['hr','quote'],
     ['ul','ol','task'],
     ['table','image','link'],
     ['code','codeblock']
   ],
   hooks:{addImageBlobHook:function(blob,callback){
     if(!/^image\/(jpeg|png|webp|gif)$/.test(blob.type)||blob.size>1500000){error.textContent='이미지는 JPG·PNG·WebP·GIF 형식의 1.5MB 이하만 첨부할 수 있습니다.';return false}
     const reader=new FileReader();
     reader.onload=()=>{callback(reader.result,blob.name||'이미지');schedule()};
     reader.onerror=()=>{error.textContent='이미지 파일을 읽지 못했습니다.'};
     reader.readAsDataURL(blob);return false;
   }}
 });
 function save(){
   try{localStorage.setItem(key,JSON.stringify({cat:board.value,title:title.value,markdown:editor.getMarkdown()}));status.textContent='자동저장됨';error.textContent='';return true}
   catch(e){status.textContent='저장 실패';error.textContent='브라우저 저장 공간을 확인해 주세요.';return false}
 }
 function schedule(){status.textContent='저장 중…';clearTimeout(timer);timer=setTimeout(save,700)}
 editor.on('change',schedule);title.addEventListener('input',schedule);board.addEventListener('change',schedule);
 $('instory-save').onclick=()=>{if(save())status.textContent='임시저장 완료'};
 const getSafeHTML=()=>window.sanitizeEditor?window.sanitizeEditor(editor.getHTML()):editor.getHTML();
 $('instory-preview-btn').onclick=()=>{preview.innerHTML='<h2>'+esc(title.value||'제목 없음')+'</h2>'+getSafeHTML();preview.hidden=false;preview.scrollIntoView({behavior:'smooth',block:'nearest'})};
 $('instory-write-form').addEventListener('submit',e=>{
   e.preventDefault();error.textContent='';
   if(!title.value.trim()){title.focus();return}
   const html=getSafeHTML();
   if(!editor.getMarkdown().trim()){error.textContent='본문을 입력해 주세요.';return}
   try{
     const entries=JSON.parse(localStorage.getItem('bo-posts')||'[]'),id=Date.now();
     entries.unshift({id,cat:board.value,title:title.value.trim(),body:html,html:true,tag:'작성글',date:new Date().toLocaleDateString('ko-KR')});
     localStorage.setItem('bo-posts',JSON.stringify(entries));localStorage.removeItem(key);
     location.hash='#/post/'+id;
   }catch(e){error.textContent='게시물을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.'}
 });
 status.textContent=draft?'임시저장된 문서 복원됨':'작성 준비';
};
})();