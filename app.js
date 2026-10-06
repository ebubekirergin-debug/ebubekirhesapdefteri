const U="https://dduzyusrwiybvphvkzpt.supabase.co";
const K="sb_publishable_-mn0WgU0J3pE_NnOX1kIsg_Eq3m-7aR";
const s=supabase.createClient(U,K);
const q=x=>document.querySelector(x);
const qa=x=>[...document.querySelectorAll(x)];
const TRY=new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:2});
const NUM=new Intl.NumberFormat("tr-TR",{maximumFractionDigits:2});
let u=null,T=[],A=[],P=[],CATS=[],BUD=[],REC=[],SALARY=[],FORECAST=[],ledgerTab="gelir",debtView="active",selectedMonth=new Date().getFullYear()+"-"+String(new Date().getMonth()+1).padStart(2,"0"),detailAccountId=null,rtChannel=null,LIVE_RATES={USD:49.1793,EUR:55.4105,GOLD:6586.08,updatedAt:null,source:"fallback"};

const m=n=>TRY.format(Number(n||0));
const day=()=>new Date().toISOString().slice(0,10);
const safe=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const moneyUnit=c=>({TRY:"TL",USD:"USD",EUR:"EUR",GOLD:"gr altın"}[c]||c||"TL");
const amountUnit=(n,c)=>c==="TRY"?m(n):NUM.format(Number(n||0))+" "+moneyUnit(c);
const paid=id=>P.filter(x=>Number(x.account_id)===Number(id)).reduce((a,x)=>a+Number(x.amount||0),0);
const rem=a=>Math.max(0,Number(a.original_amount||0)-paid(a.id));
function manualRates(){try{return JSON.parse(localStorage.getItem("manualFinanceRates")||"{}")}catch{return {}}}
function rates(){
 const manual=manualRates(),cached=(()=>{try{return JSON.parse(localStorage.getItem("liveFinanceRates")||"{}")}catch{return {}}})();
 if(manual.enabled&&Number(manual.USD)>0&&Number(manual.EUR)>0&&Number(manual.GOLD)>0)return {USD:Number(manual.USD),EUR:Number(manual.EUR),GOLD:Number(manual.GOLD),updatedAt:manual.updatedAt||null,source:"manual"};
 return {
  USD:Number(LIVE_RATES.USD)||Number(cached.USD)||49.1793,
  EUR:Number(LIVE_RATES.EUR)||Number(cached.EUR)||55.4105,
  GOLD:Number(LIVE_RATES.GOLD)||Number(cached.GOLD)||6586.08,
  updatedAt:LIVE_RATES.updatedAt||cached.updatedAt||null,
  source:LIVE_RATES.source||cached.source||"fallback"
 };
}
async function refreshMarketRates(){
 try{
  const [usdRes,eurRes,goldRes]=await Promise.all([
   fetch("https://api.frankfurter.dev/v2/rate/usd/try",{cache:"no-store"}),
   fetch("https://api.frankfurter.dev/v2/rate/eur/try",{cache:"no-store"}),
   fetch("https://api.gold-api.com/price/XAU",{cache:"no-store"})
  ]);
  if(!usdRes.ok||!eurRes.ok||!goldRes.ok)throw new Error("market fetch failed");
  const usd=await usdRes.json(),eur=await eurRes.json(),gold=await goldRes.json();
  const usdTry=Number(usd.rate),eurTry=Number(eur.rate),xauUsd=Number(gold.price);
  const gramTry=(xauUsd/31.1034768)*usdTry;
  if(!(usdTry>0&&eurTry>0&&gramTry>0))throw new Error("invalid market data");
  LIVE_RATES={USD:usdTry,EUR:eurTry,GOLD:gramTry,updatedAt:new Date().toISOString(),source:"live"};
  localStorage.setItem("liveFinanceRates",JSON.stringify(LIVE_RATES));
  render();
 }catch(err){
  const cached=(()=>{try{return JSON.parse(localStorage.getItem("liveFinanceRates")||"{}")}catch{return {}}})();
  if(cached.USD&&cached.EUR&&cached.GOLD)LIVE_RATES={...cached,source:"cache"};
 }
}
function unitToTry(amount,currency,storedTry=0){
 const n=Number(amount||0),r=rates();
 if(currency==="TRY")return n;
 if(Number(storedTry)>0)return Number(storedTry);
 if(currency==="USD")return n*Number(r.USD||0);
 if(currency==="EUR")return n*Number(r.EUR||0);
 if(currency==="GOLD")return n*Number(r.GOLD||0);
 return n;
}
function txTry(x){return unitToTry(x.amount,x.currency,x.try_value)}
function paymentTry(p){return unitToTry(p.amount,p.currency,p.original_try_value)}
function valuedTry(a){
  const remaining=rem(a),r=rates();
  if(a.currency==="TRY")return remaining;
  if(a.currency==="USD"&&r.USD)return remaining*Number(r.USD);
  if(a.currency==="EUR"&&r.EUR)return remaining*Number(r.EUR);
  if(a.currency==="GOLD"&&r.GOLD)return remaining*Number(r.GOLD);
  if(Number(a.imported_remaining_try)>0&&Number(a.imported_remaining)>0)return remaining*(Number(a.imported_remaining_try)/Number(a.imported_remaining));
  if(Number(a.base_rate)>0)return remaining*Number(a.base_rate);
  return 0;
}
function view(ok){q("#authView")?.classList.toggle("hidden",ok);q("#appView")?.classList.toggle("hidden",!ok)}
function toast(msg){const t=q("#toast");if(!t)return;t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1600)}

async function load(){
 if(!u)return;
 const [t,a,p,c,b,r,sh,fc]=await Promise.all([
  s.from("transactions").select("*").eq("user_id",u.id).order("transaction_date",{ascending:false}),
  s.from("accounts").select("*").eq("user_id",u.id).order("start_date",{ascending:false}),
  s.from("payments").select("*").eq("user_id",u.id).order("payment_date",{ascending:false}),
  s.from("categories").select("*").eq("user_id",u.id).order("sort_order"),
  s.from("budgets").select("*").eq("user_id",u.id).order("month",{ascending:false}),
  s.from("recurring_rules").select("*").eq("user_id",u.id).order("created_at",{ascending:false}),
  s.from("salary_history").select("*").eq("user_id",u.id).order("effective_date",{ascending:false}),
  s.from("forecasts").select("*").eq("user_id",u.id)
 ]);
 T=t.data||[];A=a.data||[];P=p.data||[];CATS=c.data||[];BUD=b.data||[];REC=r.data||[];SALARY=sh.data||[];FORECAST=fc.data||[];
 render();
}
function render(){
 const now=new Date(),ym=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
 const incGross=T.filter(x=>x.type==="gelir"&&String(x.transaction_date).startsWith(ym)).reduce((a,x)=>a+txTry(x),0);
 const exp=T.filter(x=>x.type==="gider"&&String(x.transaction_date).startsWith(ym)).reduce((a,x)=>a+txTry(x),0);
 const debtPaidMonth=P.filter(p=>String(p.payment_date||"").startsWith(ym)&&A.some(a=>Number(a.id)===Number(p.account_id)&&a.record_type==="borc")).reduce((sum,p)=>sum+paymentTry(p),0);
 const totalOut=exp+debtPaidMonth;
 const balance=incGross-totalOut;
 const open=A.filter(x=>rem(x)>0), rec=open.filter(x=>x.record_type==="alacak"), debts=open.filter(x=>x.record_type==="borc");
 const recTry=rec.reduce((a,x)=>a+valuedTry(x),0),debtTry=debts.reduce((a,x)=>a+valuedTry(x),0);
 const set=(id,v)=>{const e=q(id);if(e)e.textContent=v};
 set("#monthIncome",m(incGross));set("#monthExpense",m(totalOut));set("#receivable",m(recTry));set("#debt",m(debtTry));set("#net",m(balance));
 set("#recCount",rec.length+" kayıt");set("#debtCount",debts.length+" kayıt");set("#txCount",T.length);set("#openCount",open.length);set("#payCount",P.length);
 set("#largestDebt",m(debts.reduce((mx,x)=>Math.max(mx,valuedTry(x)),0)));
 const limit=new Date(now.getTime()+30*86400000),due=open.filter(x=>x.due_date&&new Date(x.due_date+"T12:00:00")>=now&&new Date(x.due_date+"T12:00:00")<=limit);
 set("#due30",m(due.reduce((a,x)=>a+valuedTry(x),0)));set("#due30Count",due.length+" kayıt");set("#savingRate",incGross>0?"%"+Math.round((balance/incGross)*100):"%0");set("#wealthNow",m(balance));
 q("#emptyOnboarding")?.classList.toggle("hidden",!(T.length===0&&A.length===0));
 renderRates();renderMonthlySummary();renderLedger();renderPlanning();
}
function renderRates(){
 const r=rates(),set=(id,v)=>{const e=q(id);if(e)e.textContent=v};
 set("#rateUSD",r.USD?NUM.format(r.USD)+" TL":"-");set("#rateEUR",r.EUR?NUM.format(r.EUR)+" TL":"-");set("#rateGOLD",r.GOLD?NUM.format(r.GOLD)+" TL":"-");
 if(q("#rateSource")){
  const ts=r.updatedAt?new Date(r.updatedAt).toLocaleString("tr-TR"):"";
  q("#rateSource").textContent=(r.source==="manual"?"Elle belirlenen kur":r.source==="live"?"Canlı piyasa verisi":r.source==="cache"?"Son alınan piyasa verisi":"Yedek piyasa değeri")+(ts?" · "+ts:"");
 }
}
function sortRows(list,isAccount){
 const mode=q("#sortMode")?.value||"amount-desc";
 const name=x=>String(isAccount?(x.title||x.party_name||""):(x.description||"")).toLocaleLowerCase("tr-TR");
 const date=x=>String(isAccount?(x.start_date||""):(x.transaction_date||""));
 const amount=x=>isAccount?valuedTry(x):txTry(x);
 return [...list].sort((a,b)=>{
  if(mode==="amount-desc")return amount(b)-amount(a);
  if(mode==="amount-asc")return amount(a)-amount(b);
  if(mode==="date-desc")return date(b).localeCompare(date(a));
  if(mode==="date-asc")return date(a).localeCompare(date(b));
  if(mode==="name-desc")return name(b).localeCompare(name(a),"tr");
  return name(a).localeCompare(name(b),"tr");
 });
}
function monthLabel(ym){const [y,mn]=ym.split("-").map(Number);return new Date(y,mn-1,1).toLocaleDateString("tr-TR",{month:"long",year:"numeric"})}
function moveMonth(delta){const [y,mn]=selectedMonth.split("-").map(Number),d=new Date(y,mn-1+delta,1);selectedMonth=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");renderMonthlySummary();renderLedger()}
function renderMonthlySummary(){
 const income=T.filter(x=>x.type==="gelir"&&String(x.transaction_date||"").startsWith(selectedMonth)).reduce((s,x)=>s+txTry(x),0);
 const normalExpense=T.filter(x=>x.type==="gider"&&String(x.transaction_date||"").startsWith(selectedMonth)).reduce((s,x)=>s+txTry(x),0);
 const debtPayment=P.filter(p=>String(p.payment_date||"").startsWith(selectedMonth)&&A.some(a=>Number(a.id)===Number(p.account_id)&&a.record_type==="borc")).reduce((s,p)=>s+paymentTry(p),0);
 const monthRec=A.filter(a=>a.record_type==="alacak"&&String(a.start_date||"").startsWith(selectedMonth)).reduce((s,a)=>s+valuedTry(a),0);
 const set=(id,v)=>{const e=q(id);if(e)e.textContent=m(v)};
 set("#summaryIncome",income);set("#summaryExpense",normalExpense+debtPayment);set("#summaryReceivable",monthRec);set("#summaryDebtPayment",debtPayment);
 set("#monthIncome",income);set("#monthExpense",normalExpense+debtPayment);set("#net",income-normalExpense-debtPayment);
}
function renderLedger(){
 const panel=q("#ledgerPanel");if(!panel)return;
 if(q("#selectedMonthLabel"))q("#selectedMonthLabel").textContent=monthLabel(selectedMonth);
 const titles={gelir:"Gelir",gider:"Gider",alacak:"Alacak",borc:"Borçlar"};q("#ledgerTitle").textContent=titles[ledgerTab];
 qa("[data-ledger-tab]").forEach(b=>b.classList.toggle("active",b.dataset.ledgerTab===ledgerTab));
 const z=(q("#search")?.value||"").toLocaleLowerCase("tr-TR");
 q("#debtSubtabs")?.classList.toggle("hidden",ledgerTab!=="borc");
 if(ledgerTab==="gelir"||ledgerTab==="gider"){
  const base=T.filter(v=>v.type===ledgerTab&&String(v.transaction_date||"").startsWith(selectedMonth)&&(String(v.description)+" "+String(v.category||"")).toLocaleLowerCase("tr-TR").includes(z));
  const debtRows=ledgerTab==="gider"?P.filter(p=>String(p.payment_date||"").startsWith(selectedMonth)&&A.some(a=>Number(a.id)===Number(p.account_id)&&a.record_type==="borc")).map(p=>{const a=A.find(x=>Number(x.id)===Number(p.account_id));return {id:"pay-"+p.id,type:"gider",transaction_date:p.payment_date,description:(a?.title||a?.party_name||"Borç")+" borç ödemesi",category:"Borç ödemesi",amount:p.amount,currency:p.currency||a?.currency||"TRY",try_value:p.original_try_value||0,_payment:true}}).filter(v=>(String(v.description)+" "+v.category).toLocaleLowerCase("tr-TR").includes(z)):[];
  const list=sortRows([...base,...debtRows],false);
  panel.innerHTML=list.length?list.map(v=>'<div class="ledger-row"><div><b>'+safe(v.description||"İşlem")+'</b><small>'+safe(v.category||"Genel")+' · '+safe(v.transaction_date||"")+'</small></div><div class="ledger-amount"><strong class="'+(v.type==="gelir"?"pos":"neg")+'">'+amountUnit(v.amount,v.currency)+'</strong>'+(v.currency!=="TRY"?'<small>TL karşılığı '+m(txTry(v))+'</small>':'')+(v._payment?'':'<div class="actions"><button data-edit-tx="'+v.id+'">Düzenle</button><button data-del-tx="'+v.id+'">Sil</button></div>')+'</div></div>').join(""):'<div class="empty">Kayıt yok.</div>';
 }else{
  const completed=ledgerTab==="borc"&&debtView==="completed";
  const list=sortRows(A.filter(v=>{
   const stateOk=completed?(v.record_type==="borc"&&rem(v)<=0.0001):(v.record_type===ledgerTab&&rem(v)>0.0001);
   const monthOk=true;
   const searchOk=(String(v.party_name)+" "+String(v.title||"")+" "+String(v.note||"")).toLocaleLowerCase("tr-TR").includes(z);
   return stateOk&&monthOk&&searchOk;
  }),true);
  panel.innerHTML=list.length?list.map(v=>{
   const pv=paid(v.id),rv=rem(v),tl=valuedTry(v);
   return '<button class="ledger-row account-link '+(rv<=0.0001?"completed-row":"")+'" data-account-detail="'+v.id+'"><div><b>'+safe(v.title||v.party_name)+'</b><small>'+safe(v.party_name)+' · '+safe(v.debt_kind||"Genel")+' · '+(rv<=0.0001?"Ödemesi bitti":safe(v.status||""))+'</small></div><div class="ledger-amount"><strong class="'+(rv<=0.0001?"done":v.record_type==="alacak"?"pos":"neg")+'">'+amountUnit(rv,v.currency)+'</strong>'+(v.currency!=="TRY"?'<small>TL karşılığı '+m(tl)+'</small>':'')+'<small>Ödenen/Tahsil '+amountUnit(pv,v.currency)+' · '+P.filter(x=>Number(x.account_id)===Number(v.id)).length+' kayıt</small></div></button>'
  }).join(""):'<div class="empty">Kayıt yok.</div>';
 }
}
function renderPlanning(){
 const cat=q("#categories");if(cat)cat.innerHTML=CATS.length?CATS.map(x=>'<span class="pill">'+safe(x.name)+' · '+safe(x.kind)+'</span>').join(""):'<div class="empty">Kategori yok.</div>';
 const bud=q("#budgets");if(bud)bud.innerHTML=BUD.length?BUD.slice(0,10).map(x=>'<div class="budget-item"><b>'+safe(x.category)+'</b><span> '+m(x.amount)+'</span></div>').join(""):'<div class="empty">Bütçe yok.</div>';
 const rr=q("#recurring");if(rr)rr.innerHTML=REC.length?REC.map(x=>'<div class="row"><div><b>'+safe(x.description)+'</b><small>'+safe(x.category||"Genel")+' · ayın '+x.day_of_month+'. günü</small></div><strong>'+amountUnit(x.amount,x.currency)+'</strong></div>').join(""):'<div class="empty">Tekrarlayan işlem yok.</div>';
 const sp=q("#salaryPanel");if(sp)sp.innerHTML=SALARY.length?SALARY.map(x=>'<div class="row"><div><b>'+m(x.net_salary)+'</b><small>'+safe(x.effective_date||"")+'</small></div></div>').join(""):'<div class="empty">Maaş kaydı yok.</div>';
 const fp=q("#forecastPanel");if(fp)fp.innerHTML=FORECAST.length?FORECAST.map(x=>'<div class="row"><div><b>'+safe(x.period_label)+'</b><small>'+m(x.estimated_net)+'</small></div></div>').join(""):'<div class="empty">Öngörü kaydı yok.</div>';
}

function open(k){
 q("#kind").value=k;q("#amount").value="";q("#description").value="";q("#date").value=day();q("#category").value="Genel";q("#note").value="";q("#currency").value="TRY";q("#installmentCount").value=0;q("#installmentLabel").classList.toggle("hidden",k!=="borc");q("#dateLabelText").textContent=k==="borc"?"Borç alma tarihi":"Tarih";q("#accountPaymentDate").value="";q("#accountPaymentDateLabel").classList.toggle("hidden",k!=="borc");
 q("#entryTitle").textContent=({gelir:"Gelir ekle",gider:"Gider ekle",alacak:"Alacak ekle",borc:"Borç ekle"})[k];
 q("#entryDialog").showModal();
}
async function saveEntry(e){
 e.preventDefault();const k=q("#kind").value,c=q("#currency").value,amount=Number(q("#amount").value);if(!(amount>0))return;
 let r;if(k==="gelir"||k==="gider")r=await s.from("transactions").insert({user_id:u.id,type:k,transaction_date:q("#date").value,description:q("#description").value,category:q("#category").value,amount,currency:c,note:q("#note").value});
 else {const installments=k==="borc"?Math.max(0,Math.min(60,Number(q("#installmentCount").value||0))):0;r=await s.from("accounts").insert({user_id:u.id,title:q("#description").value,party_name:q("#description").value,record_type:k,debt_kind:"Genel",currency:c,original_amount:amount,start_date:q("#date").value,note:q("#note").value,installment_count:installments,payment_date:k==="borc"?(q("#accountPaymentDate").value||null):null,asset_type:c==="GOLD"?"GOLD":null,asset_quantity:c==="GOLD"?amount:null});}
 if(r.error)return alert(r.error.message);q("#entryDialog").close();await load();
}
function pay(id){
 const a=A.find(x=>Number(x.id)===Number(id));if(!a)return;q("#accountId").value=id;q("#paymentTitle").textContent=a.record_type==="alacak"?"Tahsilat işle":"Ödeme işle";q("#paymentAmount").value=rem(a);q("#paymentDate").value=day();q("#paymentNote").value="";q("#paymentCurrency").value=a.currency||"TRY";q("#paymentDialog").showModal();
}
async function savePayment(e){
 e.preventDefault();const id=Number(q("#accountId").value),a=A.find(x=>Number(x.id)===id),v=Number(q("#paymentAmount").value);if(!a||v<=0||v>rem(a)+0.0001)return alert("Tutar geçersiz");
 const r=await s.from("payments").insert({user_id:u.id,account_id:id,payment_date:q("#paymentDate").value,amount:v,currency:q("#paymentCurrency").value||a.currency||"TRY",note:q("#paymentNote").value});
 if(r.error)return alert(r.error.message);q("#paymentDialog").close();await load();if(detailAccountId===id)showAccountDetail(id);
}
function showAccountDetail(id){
 const a=A.find(x=>Number(x.id)===Number(id));if(!a)return;detailAccountId=id;
 const hist=P.filter(x=>Number(x.account_id)===Number(id)).sort((x,y)=>String(y.payment_date||"").localeCompare(String(x.payment_date||""))||Number(y.sequence_no||0)-Number(x.sequence_no||0));
 q("#detailType").textContent=a.record_type==="alacak"?"Alacak detayı":"Borç detayı";q("#detailParty").textContent=a.title||a.party_name;
 q("#detailOriginal").textContent=amountUnit(a.original_amount,a.currency);q("#detailPaid").textContent=amountUnit(paid(id),a.currency);q("#detailRemaining").textContent=amountUnit(rem(a),a.currency);
 const completedDate=hist.length&&rem(a)<=0.0001?hist[0].payment_date:null;
 const totalPaidTry=hist.reduce((sum,p)=>sum+paymentTry(p),0);
 const lines=[a.party_name?"Kişi / Kurum: "+a.party_name:null,a.title?"Başlık: "+a.title:null,a.debt_kind?"Cins: "+a.debt_kind:null,a.record_type==="borc"?"Taksit sayısı: "+Number(a.installment_count||0):null,"Durum: "+(rem(a)<=0.0001?"Borç kapandı":(a.status||"Açık")),a.start_date?(a.record_type==="borc"?"Borç alma tarihi: ":"Başlangıç: ")+a.start_date:null,a.payment_date?"Ödeme tarihi: "+a.payment_date:null,a.due_date?"Vade: "+a.due_date:null,completedDate?"Kapanış tarihi: "+completedDate:null,"Birim: "+moneyUnit(a.currency),"Toplam ödeme TL karşılığı: "+m(totalPaidTry),a.currency!=="TRY"?"Güncel/Excel TL karşılığı: "+m(valuedTry(a)):null,a.imported_remaining_try&&a.currency!=="TRY"?"Excel kalan TL: "+m(a.imported_remaining_try):null,a.base_rate&&a.currency!=="TRY"?"Referans kur/gram: "+NUM.format(a.base_rate)+" TL":null,a.imported_transaction_count!=null?"Excel işlem sayısı: "+a.imported_transaction_count:null,a.note?"Not: "+a.note:null].filter(Boolean);
 q("#detailMeta").innerHTML=lines.map(x=>'<div class="detail-line">'+safe(x)+'</div>').join("");
 q("#detailPartialPay").textContent=rem(a)<=0.0001?"Ödeme tamamlandı":a.record_type==="alacak"?"Kısmi tahsilat ekle":"Kısmi ödeme ekle";q("#detailPartialPay").disabled=rem(a)<=0.0001;
 q("#detailHistory").innerHTML=hist.length?hist.map(x=>'<div class="history-item"><div><b>'+(x.payment_date?new Date(x.payment_date+"T12:00:00").toLocaleDateString("tr-TR"):"Tarih belirtilmemiş")+'</b><small>'+(x.sequence_no?"#"+x.sequence_no+" · ":"")+safe(x.note||"Ödeme kaydı")+(x.original_try_value?" · O gün "+m(x.original_try_value):"")+'</small></div><strong>'+amountUnit(x.amount,x.currency||a.currency)+'</strong></div>').join(""):'<div class="empty">Henüz ödeme/tahsilat kaydı yok.</div>';
 q("#accountDetailDialog").showModal();
}

async function editTx(id){const x=T.find(v=>Number(v.id)===Number(id));if(!x)return;const d=prompt("Açıklama",x.description);if(d===null)return;const a=Number(prompt("Tutar",x.amount));if(!(a>0))return;const c=prompt("Kategori",x.category||"Genel");const r=await s.from("transactions").update({description:d,amount:a,category:c||"Genel"}).eq("id",x.id).eq("user_id",u.id);if(r.error)alert(r.error.message);else load()}
async function delTx(id){if(!confirm("Bu gelir/gider kaydı silinsin mi?"))return;const r=await s.from("transactions").delete().eq("id",id).eq("user_id",u.id);if(r.error)alert(r.error.message);else load()}
async function editAcc(id){const x=A.find(v=>Number(v.id)===Number(id));if(!x)return;const n=prompt("Kişi / kurum",x.party_name);if(n===null)return;const a=Number(prompt("Toplam tutar",x.original_amount));if(!(a>0))return;const ic=x.record_type==="borc"?Number(prompt("Taksit sayısı (0-60)",x.installment_count||0)):0;if(ic<0||ic>60||!Number.isInteger(ic))return alert("Taksit sayısı 0 ile 60 arasında tam sayı olmalı.");const r=await s.from("accounts").update({party_name:n,original_amount:a,installment_count:ic}).eq("id",x.id).eq("user_id",u.id);if(r.error)alert(r.error.message);else load()}
async function delAcc(id){if(!confirm("Bu borç/alacak ve ödeme geçmişi silinsin mi?"))return;await s.from("payments").delete().eq("account_id",id).eq("user_id",u.id);const r=await s.from("accounts").delete().eq("id",id).eq("user_id",u.id);if(r.error)alert(r.error.message);else{q("#accountDetailDialog")?.close();load()}}

qa("[data-ledger-tab]").forEach(b=>b.addEventListener("click",()=>{ledgerTab=b.dataset.ledgerTab;if(ledgerTab==="borc")debtView="active";renderLedger()}));
qa("[data-debt-view]").forEach(b=>b.addEventListener("click",()=>{debtView=b.dataset.debtView;qa("[data-debt-view]").forEach(x=>x.classList.toggle("active",x.dataset.debtView===debtView));renderLedger()}));
q("#prevMonth")?.addEventListener("click",()=>moveMonth(-1));
q("#nextMonth")?.addEventListener("click",()=>moveMonth(1));
q("#todayMonth")?.addEventListener("click",()=>{const d=new Date();selectedMonth=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");renderMonthlySummary();renderLedger()});
q("#sortMode")?.addEventListener("change",renderLedger);
q("#exportExcel")?.addEventListener("click",exportExcel);
function exportExcel(){
 const wb=XLSX.utils.book_new();
 const txRows=T.map(x=>({"Tür":x.type==="gelir"?"Gelir":"Gider","Tarih":x.transaction_date,"Açıklama":x.description,"Kategori":x.category,"Tutar":Number(x.amount||0),"Birim":moneyUnit(x.currency),"TL Karşılığı":txTry(x),"Durum":x.status||"","Not":x.note||""}));
 const accRows=A.map(a=>({"Tür":a.record_type==="borc"?"Borç":"Alacak","Başlık":a.title||"","Kişi / Kurum":a.party_name||"","Borç Cinsi":a.debt_kind||"","Başlangıç":a.start_date||"","Ödeme Tarihi":a.payment_date||"","Vade":a.due_date||"","İlk Tutar":Number(a.original_amount||0),"Birim":moneyUnit(a.currency),"Taksit Sayısı":Number(a.installment_count||0),"Ödenen / Tahsil":paid(a.id),"Kalan":rem(a),"Kalan TL Karşılığı":valuedTry(a),"Durum":rem(a)<=0.0001?"Bitti":(a.status||"Açık"),"Not":a.note||""}));
 const payRows=P.map(p=>{const a=A.find(x=>Number(x.id)===Number(p.account_id));return {"Borç / Alacak":a?.title||a?.party_name||"","Tür":a?.record_type==="borc"?"Borç Ödemesi":"Alacak Tahsilatı","Tarih":p.payment_date||"","Tutar":Number(p.amount||0),"Birim":moneyUnit(p.currency||a?.currency),"TL Karşılığı":paymentTry(p),"İşlem No":p.sequence_no||"","Not":p.note||""}});
 XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(txRows.filter(x=>x["Tür"]==="Gelir")),"Gelirler");
 XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(txRows.filter(x=>x["Tür"]==="Gider")),"Giderler");
 XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(accRows.filter(x=>x["Tür"]==="Alacak")),"Alacaklar");
 XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(accRows.filter(x=>x["Tür"]==="Borç")),"Borçlar");
 XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(payRows),"Ödeme Geçmişi");
 XLSX.writeFile(wb,"Hesap-Defteri-"+day()+".xlsx");
 toast("Excel dosyası hazırlandı");
}
q("#ledgerAdd")?.addEventListener("click",()=>{if(ledgerTab==="borc"&&debtView==="completed")return toast("Biten borçlar otomatik oluşur");open(ledgerTab)});q("#search")?.addEventListener("input",renderLedger);
qa("[data-kind]").forEach(b=>b.addEventListener("click",()=>open(b.dataset.kind)));
q("#closeEntry")?.addEventListener("click",()=>q("#entryDialog").close());q("#entryForm")?.addEventListener("submit",saveEntry);
q("#closePayment")?.addEventListener("click",()=>q("#paymentDialog").close());q("#paymentForm")?.addEventListener("submit",savePayment);
q("#closeAccountDetail")?.addEventListener("click",()=>q("#accountDetailDialog").close());
q("#detailPartialPay")?.addEventListener("click",()=>{q("#accountDetailDialog").close();pay(detailAccountId)});
q("#detailEdit")?.addEventListener("click",()=>editAcc(detailAccountId));q("#detailDelete")?.addEventListener("click",()=>delAcc(detailAccountId));
document.addEventListener("click",e=>{const a=e.target.closest("[data-account-detail]"),et=e.target.closest("[data-edit-tx]"),dt=e.target.closest("[data-del-tx]");if(a)showAccountDetail(a.dataset.accountDetail);if(et)editTx(et.dataset.editTx);if(dt)delTx(dt.dataset.delTx)});

q("#addCategory")?.addEventListener("click",async()=>{const name=prompt("Kategori adı");if(!name)return;const kind=prompt("Tür: gelir, gider veya both","both");if(!["gelir","gider","both"].includes(kind))return;const r=await s.from("categories").insert({user_id:u.id,name,kind});if(r.error)alert(r.error.message);else load()});
q("#addBudget")?.addEventListener("click",async()=>{const category=prompt("Kategori");if(!category)return;const amount=Number(prompt("Aylık bütçe"));if(!(amount>0))return;const d=new Date(),month=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-01";const r=await s.from("budgets").upsert({user_id:u.id,category,month,amount},{onConflict:"user_id,category,month"});if(r.error)alert(r.error.message);else load()});
q("#addRecurring")?.addEventListener("click",async()=>{const type=prompt("Tür: gelir veya gider","gider");if(!["gelir","gider"].includes(type))return;const description=prompt("Açıklama");if(!description)return;const amount=Number(prompt("Tutar"));if(!(amount>0))return;const day_of_month=Number(prompt("Ayın kaçıncı günü?","1"));if(day_of_month<1||day_of_month>31)return;const category=prompt("Kategori","Genel")||"Genel";const r=await s.from("recurring_rules").insert({user_id:u.id,type,description,category,amount,currency:"TRY",day_of_month});if(r.error)alert(r.error.message);else load()});


function openSettings(){
 const r=rates(),manual=manualRates();
 q("#manualUSD").value=manual.USD||r.USD||"";
 q("#manualEUR").value=manual.EUR||r.EUR||"";
 q("#manualGOLD").value=manual.GOLD||r.GOLD||"";
 q("#manualRatesEnabled").checked=!!manual.enabled;
 q("#settingsDialog").showModal();
}
q("#openSettings")?.addEventListener("click",openSettings);
q("#closeSettings")?.addEventListener("click",()=>q("#settingsDialog").close());
q("#settingsForm")?.addEventListener("submit",e=>{
 e.preventDefault();
 const USD=Number(q("#manualUSD").value),EUR=Number(q("#manualEUR").value),GOLD=Number(q("#manualGOLD").value);
 if(!(USD>0&&EUR>0&&GOLD>0))return alert("USD, EUR ve gram altın değerlerini gir.");
 localStorage.setItem("manualFinanceRates",JSON.stringify({USD,EUR,GOLD,enabled:q("#manualRatesEnabled").checked,updatedAt:new Date().toISOString()}));
 q("#settingsDialog").close();render();toast("Kur ayarları kaydedildi");
});
q("#useLiveRates")?.addEventListener("click",async()=>{
 const x=manualRates();localStorage.setItem("manualFinanceRates",JSON.stringify({...x,enabled:false}));
 q("#manualRatesEnabled").checked=false;q("#settingsDialog").close();await refreshMarketRates();render();toast("Canlı kura dönüldü");
});

q("#signIn")?.addEventListener("click",async()=>{const r=await s.auth.signInWithPassword({email:q("#email").value,password:q("#password").value});q("#authMsg").textContent=r.error?r.error.message:"";if(!r.error){u=r.data.user;view(true);startRealtime();load()}});
q("#signUp")?.addEventListener("click",async()=>{const r=await s.auth.signUp({email:q("#email").value,password:q("#password").value});q("#authMsg").textContent=r.error?r.error.message:"Hesap oluşturuldu. E-postanı doğrula."});
q("#signOut")?.addEventListener("click",async()=>{await s.auth.signOut();u=null;view(false)});
function startRealtime(){if(!u||rtChannel)return;rtChannel=s.channel("finance-live").on("postgres_changes",{event:"*",schema:"public",table:"transactions",filter:"user_id=eq."+u.id},load).on("postgres_changes",{event:"*",schema:"public",table:"accounts",filter:"user_id=eq."+u.id},load).on("postgres_changes",{event:"*",schema:"public",table:"payments",filter:"user_id=eq."+u.id},load).subscribe(st=>{if(st==="SUBSCRIBED")toast("Canlı senkronizasyon aktif")})}
s.auth.onAuthStateChange((_e,session)=>{u=session?.user||null;if(u){view(true);startRealtime();load()}else view(false)});
(async()=>{const r=await s.auth.getSession();u=r.data.session?.user||null;view(!!u);await refreshMarketRates();if(u){startRealtime();load()}setInterval(refreshMarketRates,60000)})();