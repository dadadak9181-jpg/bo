
(function(){
const money=n=>Math.round(n).toLocaleString('ko-KR')+'원';
const percent=n=>(Number.isFinite(n)?n:0).toFixed(2)+'%';
const root=()=>document.getElementById('instory-proposal');
const get=id=>document.getElementById(id);
const num=id=>Number(String(get(id)?.value||'').replace(/,/g,''))||0;
let mode='amount';
function solve(P,n,m,target,annual){
 if(target<=P*n)return 0;
 const val=r=>{let total=0;for(let k=1;k<=n;k++)total+=P*Math.pow(1+r,annual?(k+m)/12:k+m);return total};
 let lo=0,hi=.05;
 while(val(hi)<target&&hi<100)hi=hi*2;
 if(val(hi)<target)return NaN;
 for(let j=0;j<100;j++){const mid=(lo+hi)/2;if(val(mid)<target)lo=mid;else hi=mid}
 return (lo+hi)/2;
}
function calc(){
 const P=num('iga-monthly'),years=num('iga-pay-years'),defer=num('iga-defer-years'),n=years*12,m=defer*12,principal=P*n;
 if(!Number.isInteger(years)||years<1||years>50||!Number.isInteger(defer)||defer<0||defer>50||P<=0||P>1e11){get('iga-error').textContent='납입액은 양수, 납입 기간 1~50년, 거치 기간 0~50년으로 입력하세요.';return}
 let refund=mode==='rate'?Math.round(principal*num('iga-refund-rate')/100):num('iga-refund');
 if(!Number.isFinite(refund)||refund<0||refund>1e15){get('iga-error').textContent='만기 환급금액 또는 환급률을 확인하세요.';return}
 get('iga-error').textContent='';
 const gain=refund-principal,ratio=refund/principal*100;
 if(mode==='rate')get('iga-refund').value=refund.toLocaleString('ko-KR');
 else get('iga-refund-rate').value=ratio.toFixed(2);
 const weight=n*m+n*(n+1)/2;
 const simple=gain/P/weight*1200,bank=simple/(1-.154);
 const tax=Math.round(Math.max(0,gain)*.154),bankNet=refund-tax;
 const compound=solve(P,n,m,refund,false)*1200,annual=solve(P,n,m,refund,true)*100;
 const values={
 'iga-result-principal':money(principal),'iga-result-refund':money(refund),
 'iga-result-gain':money(gain),'iga-result-ratio':percent(ratio),
 'iga-result-bank':percent(bank),'iga-result-simple':percent(simple),
 'iga-result-compound':percent(compound),'iga-result-annual':percent(annual),
 'iga-bank-principal':money(principal),'iga-plan-principal':money(principal),
 'iga-bank-interest':money(gain),'iga-plan-interest':money(gain),
 'iga-bank-tax':'−'+money(tax),'iga-plan-tax':'0원',
 'iga-bank-total':money(bankNet),'iga-plan-total':money(refund)};
 for(const [id,value] of Object.entries(values))get(id).textContent=value;
 get('iga-explanation').textContent=years+'년간 매월 '+money(P)+'을 납입하고 '+defer+'년 거치 후, 총 원금 '+money(principal)+' 대비 만기 환급금 '+money(refund)+'을 받는 가정입니다. 동일한 세전 이자를 일반과세(15.4%)로 계산하면 세금 '+money(tax)+'이 차감됩니다.';
}
window.instoryInterestPage=()=>`<div class="page-head" data-hero="interest"><div class="shell"><div class="crumb">HOME / 이자 계산기</div><h1>이자 계산기</h1><p>월납 비과세 금융 플랜의 만기 환급액과 일반과세 이자 수익을 비교하세요.</p></div></div>
<main class="shell content iga-proposal" id="instory-proposal">
<div class="iga-header"><div><span class="iga-eyebrow">FINANCIAL COMPARISON</span><h2>비과세 금융 플랜 수익률 계산기</h2><p>납입 조건과 예상 환급액을 입력하면 수익률을 자동으로 비교합니다.</p></div><button class="iga-print" type="button" id="iga-print">인쇄 / PDF 저장 <span aria-hidden="true">↗</span></button></div>
<div class="iga-layout"><section class="iga-input-panel"><h3>계산 조건 <small>필수 입력</small></h3>
<label for="iga-monthly">매월 납입액</label><div class="iga-control"><input id="iga-monthly" type="text" inputmode="numeric" value="500,000"><span>원</span></div>
<div class="iga-fields"><div><label for="iga-pay-years">납입 기간</label><div class="iga-control"><input id="iga-pay-years" type="number" min="1" max="50" step="1" value="5"><span>년</span></div></div><div><label for="iga-defer-years">거치 기간</label><div class="iga-control"><input id="iga-defer-years" type="number" min="0" max="50" step="1" value="5"><span>년</span></div></div></div>
<div class="iga-refund-header"><label>만기 환급 기준</label><div class="iga-mode" role="tablist" aria-label="환급 기준"><button type="button" class="active" data-iga-mode="amount" role="tab" aria-selected="true">환급금액(원)</button><button type="button" data-iga-mode="rate" role="tab" aria-selected="false">환급률(%)</button></div></div>
<div class="iga-control" id="iga-amount-wrap"><input id="iga-refund" type="text" inputmode="numeric" value="39,000,000" aria-label="만기 환급금액"><span>원</span></div>
<div class="iga-control" id="iga-rate-wrap" hidden><input id="iga-refund-rate" type="number" min="0" step=".01" value="130.00" aria-label="만기 환급률"><span>%</span></div>
<p id="iga-error" role="alert" class="iga-error"></p><button class="iga-calculate" type="button" id="iga-calculate">계산 결과 반영 <span aria-hidden="true">↗</span></button>
<p class="iga-note">비과세 적용 여부는 상품 및 가입 조건에 따라 달라집니다. 모든 수치는 입력한 환급금을 기준으로 한 비교 예시입니다.</p></section>
<section class="iga-results"><div class="iga-section-title"><span>수익률 비교 리포트</span><small>입력 조건 기준</small></div>
<div class="iga-hero-rates"><div class="iga-rate-feature"><span>일반과세 은행 세전 환산 연단리</span><strong id="iga-result-bank">4.70%</strong><small>동일 세후 수익을 목표로 하는 환산 이율</small></div><div class="iga-rate-feature secondary"><span>비과세 플랜 환산 연단리</span><strong id="iga-result-simple">3.98%</strong><small>납입 시점과 거치 기간 반영</small></div></div>
<div class="iga-metrics"><div><span>총 납입 원금</span><strong id="iga-result-principal">30,000,000원</strong></div><div><span>예상 만기 환급금</span><strong id="iga-result-refund">39,000,000원</strong></div><div><span>예상 순이자</span><strong id="iga-result-gain">9,000,000원</strong></div><div><span>총 환급률</span><strong id="iga-result-ratio">130.00%</strong></div></div>
<div class="iga-subrates"><div><span>월복리 수익률 (연환산)</span><strong id="iga-result-compound">—</strong></div><div><span>연복리 수익률</span><strong id="iga-result-annual">—</strong></div></div>
</section></div>
<section class="iga-comparison"><div class="iga-section-title"><span>과세·비과세 수령액 비교</span><small>일반과세 15.4% 가정</small></div><div class="iga-table-scroll"><table><thead><tr><th>비교 항목</th><th>일반과세 금융</th><th>비과세 금융 플랜</th></tr></thead><tbody><tr><th>납입 원금</th><td id="iga-bank-principal"></td><td id="iga-plan-principal"></td></tr><tr><th>세전 이자 / 수익</th><td id="iga-bank-interest"></td><td id="iga-plan-interest"></td></tr><tr><th>이자 과세</th><td id="iga-bank-tax"></td><td id="iga-plan-tax"></td></tr><tr class="iga-highlight"><th>최종 수령액</th><td id="iga-bank-total"></td><td id="iga-plan-total"></td></tr></tbody></table></div><p id="iga-explanation" class="iga-explanation"></p></section>
<p class="iga-disclaimer">안내: 원본 IGA 계산기의 공개 화면 및 계산식을 참고해 재구현한 추정 도구입니다. 비과세 자격과 실제 상품 수익을 보증하지 않으며, 손실 사례·세법·상품 조건은 별도로 검토해야 합니다. 일반과세 비교는 동일한 세전 이자에 세율 15.4%를 적용한 가정입니다.</p>
</main>`;
window.instoryInitInterest=()=>{
 const rootEl=root();if(!rootEl)return;
 const sync=e=>{if(e?.target?.id==='iga-monthly'||e?.target?.id==='iga-refund'){const el=e.target;let digits=el.value.replace(/[^0-9]/g,'');el.value=digits?Number(digits).toLocaleString('ko-KR'):''}calc()};
 rootEl.querySelectorAll('input').forEach(el=>{el.addEventListener('input',sync);el.addEventListener('change',sync)});
 rootEl.querySelectorAll('[data-iga-mode]').forEach(b=>b.addEventListener('click',()=>{
 mode=b.dataset.igaMode;
 rootEl.querySelectorAll('[data-iga-mode]').forEach(v=>{const on=v===b;v.classList.toggle('active',on);v.setAttribute('aria-selected',String(on))});
 get('iga-amount-wrap').hidden=mode!=='amount';get('iga-rate-wrap').hidden=mode!=='rate';calc();
 }));
 get('iga-calculate').addEventListener('click',calc);
 get('iga-print').addEventListener('click',()=>window.print());
 mode='amount';calc();
};
})();