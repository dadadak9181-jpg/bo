/* INSTORY: magazine archive from user supplied capture screenshots.
   Replace images and metadata with original Playwright assets when available. */
const capturedMagazines = [
  {id:'hyundai',company:'현대해상', title:'하이매거진 2026년 10월호',month:'2026.10',date:'2026-10-23',group:'손해보험',file:'hyundai.jpg',complete:true},
  {id:'nh',company:'NH농협생명',title:'농협레터 2026년 10월호',month:'2026.10',date:'2026-10-03',group:'생명보험',file:'nh.jpg',complete:true},
  {id:'metlife',company:'메트라이프생명',title:'GA 소식지 2026년 10월호',month:'2026.10',date:'2026-10-03',group:'생명보험',file:'metlife.jpg',complete:true},
  {id:'aia',company:'AIA생명',title:'GA 소식지 2026년 10월호',month:'2026.10',date:'2026-10-03',group:'생명보험',file:'aia.jpg',complete:true},
  {id:'kdb',company:'KDB생명',title:'GA MAGAZINE 2026년 10월호',month:'2026.10',date:'2026-10',group:'생명보험',file:'kdb.jpg',complete:false},
  {id:'fubon',company:'푸본현대생명',title:'Hyundai Life 2026년 10월호',month:'2026.10',date:'2026-10',group:'생명보험',file:'fubon.jpg',complete:false}
];
const magazineInsurerGroups={"생명보험":["ABL생명","AIA생명","DB생명","KB라이프생명","KDB생명","NH농협생명","교보생명","동양생명","라이나생명","메트라이프생명","미래에셋생명","삼성생명","신한라이프생명","처브라이프생명","푸본현대생명","하나생명","한화생명","흥국생명"],"손해보험":["AIG손해보험","DB손해보험","KB손해보험","NH농협손해보험","라이나손해보험","롯데손해보험","메리츠화재","삼성화재","하나손해보험","한화손보","현대해상","흥국화재"]};
const magazineEsc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const magazineImg=p=>p.coverUrl||'assets/magazines/'+p.file;
function magazineHome(){return `<div class="page-head mag-hero"><div class="shell"><div class="crumb">INSTORY / INSURANCE LIBRARY</div><h1>보험 소식지 아카이브</h1></div></div>
<div class="shell mag-main">
<div class="mag-layout"><aside class="mag-sidebar" aria-label="소식지 분류"><section class="mag-side-group"><h2>분류별 필터</h2><div class="mag-side-chips" id="mag-groups"><button type="button" class="active" data-group="전체">전체</button><button type="button" data-group="생명보험">생명보험</button><button type="button" data-group="손해보험">손해보험</button></div></section><section class="mag-side-group"><h2>월별 소식지</h2><div class="mag-archive-heading mag-year-stepper"><button type="button" data-year-step="-1" aria-label="이전 연도"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button><strong id="mag-archive-title">2026년 소식지</strong><button type="button" data-year-step="1" aria-label="다음 연도"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button></div><div class="mag-month-detail"><div class="mag-month-list" id="mag-month-list" aria-label="월별 소식지 선택"></div><div id="mag-insurer-tree" class="mag-insurer-tree" aria-label="선택 월 보험사"></div></div></section></aside>
<main class="mag-results"><div class="mag-results-head"><h2>보험사 소식지 <span id="mag-count">6</span></h2></div><div class="mag-search-wrap"><label class="mag-search"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input id="mag-search" aria-label="소식지 검색" placeholder="소식지 제목, 보험사명으로 검색" autocomplete="off"></label></div><div class="mag-grid" id="mag-grid"></div><div id="mag-empty" class="mag-empty" hidden>이 달에 등록된 소식지가 없습니다.</div></main></div></div>
<div class="mag-lightbox" id="mag-lightbox" role="dialog" aria-modal="true" aria-label="소식지 이미지 확대" hidden><div class="mag-overlay"></div><button type="button" class="mag-close" id="mag-close" aria-label="닫기">×</button><button type="button" class="mag-prev" id="mag-prev" aria-label="이전 소식지">‹</button><figure class="mag-lightbox-figure"><img id="mag-large" alt=""><figcaption id="mag-caption"></figcaption></figure><button type="button" class="mag-next" id="mag-next" aria-label="다음 소식지">›</button></div>`}
function setupMagazine(){
  const grid=document.getElementById('mag-grid');if(!grid)return;
  const search=document.getElementById('mag-search'),groups=document.getElementById('mag-groups');
  const overlay=document.getElementById('mag-lightbox');
  const fresh=window.instoryMagazineRecords||[];
  for(const p of fresh){if(!capturedMagazines.some(x=>x.id===p.id))capturedMagazines.unshift(p)}
  let group='전체',selectedMonth='2026.10',selectedInsurer='',calendarYear=2026,visible=capturedMagazines.slice(),current=0,lastFocused=null;
  function update(){const q=search.value.trim().toLowerCase();visible=capturedMagazines.filter(p=>p.month===selectedMonth&&(group==='전체'||p.group===group)&&(!selectedInsurer||p.company===selectedInsurer)&&[p.company,p.title,p.month].join(' ').toLowerCase().includes(q));
    grid.innerHTML=visible.map(p=>`<article class="mag-card"><div class="mag-cover"><a class="mag-open" href="#/magazine/${encodeURIComponent(p.id)}" aria-label="${magazineEsc(p.title)} 상세 내용 보기"><img src="${magazineImg(p)}" alt="${magazineEsc(p.company)} ${magazineEsc(p.title)} 표지" loading="lazy"><span class="mag-zoom">상세 보기 ↗</span></a></div><div class="mag-card-meta"><span class="mag-category">${magazineEsc(p.company)}</span><time>${magazineEsc(p.month)}</time></div><a class="mag-card-title mag-open" href="#/magazine/${encodeURIComponent(p.id)}">${magazineEsc(p.title)}</a><div class="mag-card-foot"><button type="button" class="mag-pdf" data-pdf="${p.id}">PDF 다운로드</button><button type="button" class="mag-share" data-share="${p.id}">카카오톡 공유</button></div></article>`).join('');
    document.getElementById('mag-count').textContent=visible.length;
    document.getElementById('mag-empty').textContent=Number(selectedMonth.slice(5))+'월 소식지 준비 중';
    document.getElementById('mag-empty').hidden=visible.length>0;
    document.getElementById('mag-archive-title').textContent=calendarYear+'년 소식지';
    document.getElementById('mag-month-list').innerHTML=Array.from({length:12},(_,i)=>{const month=calendarYear+'.'+String(i+1).padStart(2,'0');const count=capturedMagazines.filter(p=>p.month===month).length;return `<button type="button" data-month="${month}" class="mag-month-item${selectedMonth===month?' active':''}" aria-pressed="${selectedMonth===month}"><span>${i+1}월호</span><span class="mag-month-count">${count?count+'건':'0건'}</span></button>`}).join('');
    const monthPosts=capturedMagazines.filter(p=>p.month===selectedMonth);
    const insurerTree=document.getElementById('mag-insurer-tree');
    const available=Array.from(new Set(monthPosts.map(p=>p.company)));
    const groupMap=Object.fromEntries(Object.entries(magazineInsurerGroups).map(([name,names])=>[name,[...names,...available.filter(n=>!names.includes(n)&&monthPosts.some(p=>p.company===n&&p.group===name))]]));
    const allCount=Object.values(groupMap).reduce((n,v)=>n+v.length,0);
    insurerTree.innerHTML='<div class="mag-insurer-month-title">'+Number(selectedMonth.slice(5))+'월호 <small>('+allCount+')</small></div>'+
      Object.entries(groupMap).map(([name,names])=>'<section class="mag-insurer-section"><h3>'+magazineEsc(name)+'</h3><div class="mag-insurer-chips">'+names.map(insurer=>'<button type="button" data-insurer="'+magazineEsc(insurer)+'" class="'+(selectedInsurer===insurer?'selected':'')+'">'+magazineEsc(insurer)+'</button>').join('')+'</div></section>').join('');

  }
  async function downloadMagazine(id){const p=capturedMagazines.find(x=>x.id===id);if(!p)return;if(p.pdf){const link=document.createElement('a');link.href=p.pdf;link.download=p.company+'_'+p.month+'.pdf';document.body.append(link);link.click();link.remove();return}alert('이 소식지의 원본 PDF 파일은 아직 등록되지 않았습니다. 원본 PDF가 등록되면 여기에서 다운로드할 수 있습니다.');}
  async function shareMagazine(id){const p=capturedMagazines.find(x=>x.id===id);if(!p)return;const url=location.origin+location.pathname+'#/magazines?mag='+encodeURIComponent(id);const title=p.company+' · '+p.title;try{if(window.Kakao?.isInitialized?.()){window.Kakao.Share.sendDefault({objectType:'feed',content:{title,description:'INSTORY 보험 소식지',imageUrl:new URL(magazineImg(p),location.href).href,link:{mobileWebUrl:url,webUrl:url}}});return}if(navigator.share){await navigator.share({title,text:title,url});return}await navigator.clipboard.writeText(url);alert('공유 링크가 복사되었습니다. 카카오톡에 붙여넣어 공유하세요.')}catch(e){if(e.name!=='AbortError')alert('공유에 실패했습니다. 다시 시도해 주세요.')}}
  function show(index){if(!visible.length)return;current=(index+visible.length)%visible.length;const p=visible[current];document.getElementById('mag-large').src=magazineImg(p);document.getElementById('mag-large').alt=p.company+' '+p.title+' 표지';document.getElementById('mag-caption').textContent=p.company+' · '+p.title+(p.complete?'':' · 표지 일부만 확보');overlay.hidden=false;document.body.style.overflow='hidden';document.getElementById('mag-close').focus()}
  function close(){overlay.hidden=true;document.body.style.overflow='';if(lastFocused?.isConnected)lastFocused.focus()}
  search.addEventListener('input',update);groups.addEventListener('click',e=>{const btn=e.target.closest('[data-group]');if(!btn)return;group=btn.dataset.group;groups.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===btn));update()});
  grid.addEventListener('click',e=>{const pdf=e.target.closest('[data-pdf]');if(pdf){downloadMagazine(pdf.dataset.pdf);return}const share=e.target.closest('[data-share]');if(share){shareMagazine(share.dataset.share);return}});
  document.getElementById('mag-month-list').addEventListener('click',e=>{const b=e.target.closest('[data-month]');if(!b)return;selectedMonth=b.dataset.month;selectedInsurer='';search.value='';update()});
  document.getElementById('mag-insurer-tree').addEventListener('click',e=>{const b=e.target.closest('[data-insurer]');if(!b)return;selectedInsurer=selectedInsurer===b.dataset.insurer?'':b.dataset.insurer;group='전체';groups.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x.dataset.group==='전체'));search.value='';update()});
  document.querySelector('.mag-year-stepper').addEventListener('click',e=>{const btn=e.target.closest('[data-year-step]');if(!btn)return;calendarYear=Math.max(2000,Math.min(2100,calendarYear+Number(btn.dataset.yearStep)));selectedMonth=calendarYear+'.'+(calendarYear===2026?'10':'01');selectedInsurer='';search.value='';update()});
  document.getElementById('mag-close').addEventListener('click',close);overlay.querySelector('.mag-overlay').addEventListener('click',close);document.getElementById('mag-prev').addEventListener('click',()=>show(current-1));document.getElementById('mag-next').addEventListener('click',()=>show(current+1));
  const keyboard=e=>{if(overlay.hidden||!overlay.isConnected){document.removeEventListener('keydown',keyboard);return}if(e.key==='Escape'){e.preventDefault();close()}else if(e.key==='ArrowLeft'){e.preventDefault();show(current-1)}else if(e.key==='ArrowRight'){e.preventDefault();show(current+1)}else if(e.key==='Tab'){e.preventDefault();document.getElementById('mag-close').focus()}};document.addEventListener('keydown',keyboard);
  update();
}

function magazineDetail(id){
 const p=capturedMagazines.find(x=>String(x.id)===String(id))||(window.instoryMagazineRecords||[]).find(x=>String(x.id)===String(id));
 if(!p)return '<main class="shell mag-detail"><h1>소식지를 찾을 수 없습니다.</h1><a href="#/magazines">목록으로 돌아가기</a></main>';
 const api='https://instory-content-api.porom.workers.dev';
 const pdf=p.pdf||'';
 const isLive=/^[a-f0-9-]{36}$/.test(String(id));
 const hasCover=Boolean(p.coverUrl||p.file);
 return '<div class="page-head mag-hero"><div class="shell"><div class="crumb">INSTORY / INSURANCE LIBRARY</div><h1>보험 소식지 아카이브</h1></div></div>'+
 '<main class="shell mag-detail"><div class="mag-detail-header"><a href="#/magazines" class="mag-detail-back">‹ 목록으로</a><span class="mag-detail-month">'+magazineEsc(p.month)+'</span></div><h2>'+magazineEsc(p.title)+'</h2><p class="mag-detail-company">'+magazineEsc(p.company)+'</p>'+
 '<section id="mag-detail-content" class="mag-detail-body">'+(hasCover?'<img class="mag-detail-cover" src="'+magazineEsc(magazineImg(p))+'" alt="'+magazineEsc(p.title)+' 표지">':'')+
 (isLive?'<p class="mag-detail-loading">등록된 상세 내용을 불러오는 중입니다.</p>':'<p class="mag-detail-note">소식지 표지 미리보기입니다. 원문이 등록되면 이곳에 표시됩니다.</p>')+'</section>'+
 '<div class="mag-detail-actions">'+(pdf?'<a href="'+magazineEsc(pdf)+'" target="_blank" rel="noopener">PDF 다운로드 ↓</a>':'')+'<a href="#/magazines">목록</a></div></main>';
}
async function loadMagazineDetail(id){
 if(!/^[a-f0-9-]{36}$/.test(String(id)))return;
 const host=document.getElementById('mag-detail-content');if(!host)return;
 try{const r=await fetch('https://instory-content-api.porom.workers.dev/api/posts/'+encodeURIComponent(id));if(!r.ok)throw Error('load error');const post=await r.json();
 if(!host.isConnected)return;
 host.querySelector('.mag-detail-loading')?.remove();
 if(post.content_html){
   const frame=document.createElement('iframe');frame.className='mag-detail-article';frame.title='소식지 본문';frame.setAttribute('sandbox','');frame.srcdoc='<meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font:15px/1.8 sans-serif;color:#26394b;overflow-wrap:anywhere;padding:20px;margin:0}img{max-width:100%;height:auto}</style>'+post.content_html;
   host.appendChild(frame);
 }else if(post.pdf_key){
   const frame=document.createElement('iframe');frame.className='mag-detail-pdf';frame.title='소식지 PDF';frame.src='https://instory-content-api.porom.workers.dev/api/files/'+encodeURIComponent(post.pdf_key);host.appendChild(frame);
 }
 if(post.pdf_key){const actions=document.querySelector('.mag-detail-actions');if(actions&&!actions.querySelector('[download]')){const link=document.createElement('a');link.href='https://instory-content-api.porom.workers.dev/api/files/'+encodeURIComponent(post.pdf_key);link.textContent='PDF 다운로드 ↓';link.setAttribute('download','');actions.prepend(link)}}
 }catch(e){host.querySelector('.mag-detail-loading')?.replaceWith(document.createTextNode('상세 내용을 불러오지 못했습니다.'))}
}
