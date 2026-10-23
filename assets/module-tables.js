(function(){
'use strict';
const headings=[
null,
{title:'보험청구FAX',columns:['보험사','고객센터 / 대표번호','보험청구팩스'],desc:'보험사별 연락처와 보험금 청구 팩스를 확인합니다.',action:'A4 1장 통합 인쇄'},
{title:'청구 이메일 / URL 링크',columns:['보험사','온라인 청구 접수','이메일·앱 접수 안내'],desc:'보험금 청구 접수 채널을 보험사별로 확인합니다.'},
{title:'청구한도금액안내',columns:['보험사','접수 채널','한도·증빙 기준'],desc:'청구 방식에 따른 한도와 증빙 요건을 확인합니다.'},
{title:'청구 우편주소',columns:['보험사','청구서류 접수처','발송 전 확인'],desc:'우편 청구 접수에 필요한 주소와 확인 사항입니다.'},
{title:'청구서 모아보기',columns:['보험사','청구서 양식','서류 안내'],desc:'보험금 청구 양식과 구비서류를 확인합니다.'},
{title:'보험사별 수납일',columns:['보험사','자동이체·수납일','재청구 안내'],desc:'보험료 수납·자동이체 일정을 확인합니다.'},
{title:'카드정보',columns:['보험사','카드 납입 안내','변경·승인 확인'],desc:'보험사별 카드 납입과 결제 변경 정보를 확인합니다.'}
];
const contacts={
'메리츠화재':['1566-7711','0504-021-3400'],
'삼성화재':['080-900-7114 / 1588-5114','장기 0505-162-0872 / 재물 0505-162-0777 / 펫 0505-162-1005'],
'KB손해보험':['1544-0114','장기 0505-136-6500 / 일반(단체) 0505-136-6600 / 재물배상 0505-136-6700'],
'현대해상':['1588-5656','장기 0507-774-6060 / 펫장기 0507-774-6950 / 펫일반 0505-988-5959'],
'DB손해보험':['1588-0100','통합 0505-181-4862'],
'한화손보':['080-236-7000 / 1566-8000','0502-779-1004'],
'NH농협손해보험':['1644-9000','통합 0505-060-7000 / 임직원 0505-060-4100 / 단체 0505-060-4099'],
'흥국화재':['1688-1688','장기 0504-800-0700 / 단체 0504-800-0303 / 기업 0504-800-2202']
};
const types=['손해보험','생명보험','공제보험'];
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const hint='<span class="mod-data-pending">원본 자료 확인 필요</span>';
function logo(item,logos){const src=logos[item.name];return '<div class="mod-data-logo">'+(src?'<img src="assets/'+e(src)+'" loading="lazy" alt="'+e(item.name)+' 로고" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><strong hidden>'+e(item.name)+'</strong>':'<strong>'+e(item.name)+'</strong>')+'</div>'}
function contentCell(index,item){
 if(index===1){const row=contacts[item.name];return [row?e(row[0]).replaceAll(' / ','<br>'):hint,row?e(row[1]).replaceAll(' / ','<br>'):hint]}
 if(index===2)return ['<a class="mod-data-link" href="'+e(item.url)+'" target="_blank" rel="noopener noreferrer">공식 청구 안내 ↗</a>','이메일·앱 접수 주소는 공식 사이트에서 확인'];
 if(index===3)return ['모바일 / PC / 우편 접수',hint];
 if(index===4)return [hint,'보험사 공식 주소를 발송 전에 확인'];
 if(index===5)return ['<a class="mod-data-link" href="'+e(item.url)+'" target="_blank" rel="noopener noreferrer">청구서류 확인 ↗</a>','청구서·동의서·추가 증빙'];
 if(index===6)return [hint,'계약 납입 방식 및 재청구 여부 확인'];
 return ['<a class="mod-data-link" href="'+e(item.url)+'" target="_blank" rel="noopener noreferrer">카드 납입 안내 ↗</a>','대상 상품·카드 변경 절차 확인'];
}
window.instoryModuleTables=function(index,group,insurers,logos){
if(index<1||index>7)return '';
const c=headings[index],selection=types.includes(group)?group:'손해보험';
const list=insurers.filter(i=>i.group===selection);
let heading=c.title+(index===1?'('+(selection==='손해보험'?'손해':selection==='생명보험'?'생명':'공제')+')':'');
return '<div class="mod-data-wrap"><div class="mod-data-actions"><div class="mod-data-types">'+types.map(t=>'<button type="button" data-mod-type="'+t+'" class="'+(t===selection?'active':'')+'">'+e(t)+'</button>').join('')+'</div>'+(index===1?'<button type="button" class="mod-data-print" data-mod-print>인쇄하기 ↗</button>':'')+'</div>'+
'<div class="mod-data-box"><div class="mod-data-top"><h3>'+e(heading)+'</h3><p>'+e(c.desc)+'</p></div><div class="mod-data-scroll"><table class="mod-data-table"><thead><tr>'+c.columns.map(x=>'<th scope="col">'+e(x)+'</th>').join('')+'</tr></thead><tbody>'+
(list.length?list.map(i=>{const cols=contentCell(index,i);return '<tr><th scope="row">'+logo(i,logos)+'</th><td>'+cols[0]+'</td><td>'+cols[1]+'</td></tr>'}).join(''):'<tr><td colspan="3" class="mod-data-empty">해당 분류의 업체 자료가 아직 등록되지 않았습니다.</td></tr>')+
'</tbody></table></div><p class="mod-data-note">공식 자료의 연락처·주소·금액은 수시로 바뀔 수 있습니다. 확인되지 않은 세부 정보는 임의로 기재하지 않았습니다. '+(index===1?'표시된 일부 연락처는 제공된 캡처에서 확인한 참고값으로, 사용 전 재확인이 필요합니다.':'')+'</p></div></div>';
};
})();