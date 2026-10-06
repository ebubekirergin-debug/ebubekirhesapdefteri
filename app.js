const U="https://dduzyusrwiybvphvkzpt.supabase.co";
const K="sb_publishable_-mn0WgU0J3pE_NnOX1kIsg_Eq3m-7aR";
const s=supabase.createClient(U,K);
const q=x=>document.querySelector(x);
const qa=x=>[...document.querySelectorAll(x)];
const TRY=new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:2});
const NUM=new Intl.NumberFormat("tr-TR",{maximumFractionDigits:2});
let u=null,T=[],A=[],P=[],CATS=[],BUD=[],REC=[],SALARY=[],FORECAST=[],ledgerTab="gelir",detailAccountId=null,rtChannel=null,LIVE_RATES={USD:49.1793,EUR:55.4105,GOLD:6586.08,updatedAt:null,source:"fallback"};

const m=n=>TRY.format(Number(n||0));
const day=()=>new Date().toISOString().slice(0,10);
const safe=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const moneyUnit=c=>({TRY:"TL",USD:"USD",EUR:"EUR",GOLD:"gr altın"}[c]||c||"TL");
const amountUnit=(n,c)=>c==="TRY"?m(n):NUM.format(Number(n||0))+" "+moneyUnit(c);
const paid=id=>P.filter(x=>Number(x.account_id)===Number(id)).reduce((a,x)=>a+Number(x.amount||0),0);
const rem=a=>Math.max(0,Number(a.original_amount||0)-paid(a.id));
function rates(){
 const cached=(()=>{try{return JSON.parse(localStorage.getItem("liveFinanceRates")||"{}")}catch{return {}}})();
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
 const inc=T.filter(x=>x.type==="gelir"&&String(x.transaction_date).startsWith(ym)).reduce((a,x)=>a+Number(x.amount||0),0);
 const exp=T.filter(x=>x.type==="gider"&&String(x.transaction_date).startsWith(ym)).reduce((a,x)=>a+Number(x.amount||0),0);
 const open=A.filter(x=>rem(x)>0), rec=open.filter(x=>x.record_type==="alacak"), debts=open.filter(x=>x.record_type==="borc");
 const recTry=rec.reduce((a,x)=>a+valuedTry(x),0),debtTry=debts.reduce((a,x)=>a+valuedTry(x),0);
 const set=(id,v)=>{const e=q(id);if(e)e.textContent=v};
 set("#monthIncome",m(inc));set("#monthExpense",m(exp));set("#receivable",m(recTry));set("#debt",m(debtTry));set("#net",m(inc-exp+recTry-debtTry));
 set("#recCount",rec.length+" kayıt");set("#debtCount",debts.length+" kayıt");set("#txCount",T.length);set("#openCount",open.length);set("#payCount",P.length);
 set("#largestDebt",m(debts.reduce((mx,x)=>Math.max(mx,valuedTry(x)),0)));
 const limit=new Date(now.getTime()+30*86400000),due=open.filter(x=>x.due_date&&new Date(x.due_date+"T12:00:00")>=now&&new Date(x.due_date+"T12:00:00")<=limit);
 set("#due30",m(due.reduce((a,x)=>a+valuedTry(x),0)));set("#due30Count",due.length+" kayıt");set("#savingRate",inc>0?"%"+Math.round(((inc-exp)/inc)*100):"%0");set("#wealthNow",m(inc-exp+recTry-debtTry));
 q("#emptyOnboarding")?.classList.toggle("hidden",!(T.length===0&&A.length===0));
 renderRates();renderLedger();renderPlanning();
}
function renderRates(){
 const r=rates(),set=(id,v)=>{const e=q(id);if(e)e.textContent=v};
 set("#rateUSD",r.USD?NUM.format(r.USD)+" TL":"-");set("#rateEUR",r.EUR?NUM.format(r.EUR)+" TL":"-");set("#rateGOLD",r.GOLD?NUM.format(r.GOLD)+" TL":"-");
 if(q("#rateSource")){
  const ts=r.updatedAt?new Date(r.updatedAt).toLocaleString("tr-TR"):"";
  q("#rateSource").textContent=(r.source==="live"?"Canlı piyasa verisi":r.source==="cache"?"Son alınan piyasa verisi":"Yedek piyasa değeri")+(ts?" · "+ts:"");
 }
}
function renderLedger(){
 const panel=q("#ledgerPanel");if(!panel)return;
 const titles={gelir:"Gelir",gider:"Gider",alacak:"Alacak",borc:"Borçlar"};q("#ledgerTitle").textContent=titles[ledgerTab];
 qa("[data-ledger-tab]").forEach(b=>b.classList.toggle("active",b.dataset.ledgerTab===ledgerTab));
 const z=(q("#search")?.value||"").toLocaleLowerCase("tr-TR");
 if(ledgerTab==="gelir"||ledgerTab==="gider"){
  const list=T.filter(v=>v.type===ledgerTab&&(String(v.description)+" "+String(v.category||"")).toLocaleLowerCase("tr-TR").includes(z));
  panel.innerHTML=list.length?list.map(v=>'<div class="ledger-row"><div><b>'+safe(v.description||"İşlem")+'</b><small>'+safe(v.category||"Genel")+' · '+safe(v.transaction_date)+'</small></div><div class="ledger-amount"><strong class="'+(v.type==="gelir"?"pos":"neg")+'">'+amountUnit(v.amount,v.currency)+'</strong>'+(v.currency!=="TRY"&&Number(v.try_value)>0?'<small>'+m(v.try_value)+'</small>':'')+'<div class="actions"><button data-edit-tx="'+v.id+'">Düzenle</button><button data-del-tx="'+v.id+'">Sil</button></div></div></div>').join(""):'<div class="empty">Kayıt yok.</div>';
 }else{
  const list=A.filter(v=>v.record_type===ledgerTab&&(String(v.party_name)+" "+String(v.title||"")+" "+String(v.note||"")).toLocaleLowerCase("tr-TR").includes(z));
  panel.innerHTML=list.length?list.map(v=>{
   const pv=paid(v.id),rv=rem(v),tl=valuedTry(v);
   return '<button class="ledger-row account-link" data-account-detail="'+v.id+'"><div><b>'+safe(v.title||v.party_name)+'</b><small>'+safe(v.party_name)+' · '+safe(v.debt_kind||"Genel")+' · '+safe(v.status||"")+'</small></div><div class="ledger-amount"><strong class="'+(v.record_type==="alacak"?"pos":"neg")+'">'+amountUnit(rv,v.currency)+'</strong>'+(v.currency!=="TRY"?'<small>TL karşılığı '+m(tl)+'</small>':'')+'<small>Ödenen/Tahsil '+amountUnit(pv,v.currency)+' · '+P.filter(x=>Number(x.account_id)===Number(v.id)).length+' kayıt</small></div></button>'
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
 q("#kind").value=k;q("#amount").value="";q("#description").value="";q("#date").value=day();q("#category").value="Genel";q("#note").value="";q("#currency").value="TRY";
 q("#entryTitle").textContent=({gelir:"Gelir ekle",gider:"Gider ekle",alacak:"Alacak ekle",borc:"Borç ekle"})[k];
 q("#entryDialog").showModal();
}
async function saveEntry(e){
 e.preventDefault();const k=q("#kind").value,c=q("#currency").value,amount=Number(q("#amount").value);if(!(amount>0))return;
 let r;if(k==="gelir"||k==="gider")r=await s.from("transactions").insert({user_id:u.id,type:k,transaction_date:q("#date").value,description:q("#description").value,category:q("#category").value,amount,currency:c,note:q("#note").value});
 else r=await s.from("accounts").insert({user_id:u.id,title:q("#description").value,party_name:q("#description").value,record_type:k,debt_kind:"Genel",currency:c,original_amount:amount,start_date:q("#date").value,note:q("#note").value,asset_type:c==="GOLD"?"GOLD":null,asset_quantity:c==="GOLD"?amount:null});
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
 const lines=[a.party_name?"Kişi / Kurum: "+a.party_name:null,a.debt_kind?"Cins: "+a.debt_kind:null,a.status?"Durum: "+a.status:null,a.start_date?"Başlangıç: "+a.start_date:null,"Birim: "+moneyUnit(a.currency),a.currency!=="TRY"?"Güncel/Excel TL karşılığı: "+m(valuedTry(a)):null,a.imported_remaining_try&&a.currency!=="TRY"?"Excel kalan TL: "+m(a.imported_remaining_try):null,a.base_rate&&a.currency!=="TRY"?"Referans kur/gram: "+NUM.format(a.base_rate)+" TL":null,a.imported_transaction_count!=null?"Excel işlem sayısı: "+a.imported_transaction_count:null,a.note?"Not: "+a.note:null].filter(Boolean);
 q("#detailMeta").innerHTML=lines.map(x=>'<div class="detail-line">'+safe(x)+'</div>').join("");
 q("#detailPartialPay").textContent=a.record_type==="alacak"?"Kısmi tahsilat ekle":"Kısmi ödeme ekle";
 q("#detailHistory").innerHTML=hist.length?hist.map(x=>'<div class="history-item"><div><b>'+(x.payment_date?new Date(x.payment_date+"T12:00:00").toLocaleDateString("tr-TR"):"Tarih belirtilmemiş")+'</b><small>'+(x.sequence_no?"#"+x.sequence_no+" · ":"")+safe(x.note||"Ödeme kaydı")+(x.original_try_value?" · O gün "+m(x.original_try_value):"")+'</small></div><strong>'+amountUnit(x.amount,x.currency||a.currency)+'</strong></div>').join(""):'<div class="empty">Henüz ödeme/tahsilat kaydı yok.</div>';
 q("#accountDetailDialog").showModal();
}

async function editTx(id){const x=T.find(v=>Number(v.id)===Number(id));if(!x)return;const d=prompt("Açıklama",x.description);if(d===null)return;const a=Number(prompt("Tutar",x.amount));if(!(a>0))return;const c=prompt("Kategori",x.category||"Genel");const r=await s.from("transactions").update({description:d,amount:a,category:c||"Genel"}).eq("id",x.id).eq("user_id",u.id);if(r.error)alert(r.error.message);else load()}
async function delTx(id){if(!confirm("Bu gelir/gider kaydı silinsin mi?"))return;const r=await s.from("transactions").delete().eq("id",id).eq("user_id",u.id);if(r.error)alert(r.error.message);else load()}
async function editAcc(id){const x=A.find(v=>Number(v.id)===Number(id));if(!x)return;const n=prompt("Kişi / kurum",x.party_name);if(n===null)return;const a=Number(prompt("Toplam tutar",x.original_amount));if(!(a>0))return;const r=await s.from("accounts").update({party_name:n,original_amount:a}).eq("id",x.id).eq("user_id",u.id);if(r.error)alert(r.error.message);else load()}
async function delAcc(id){if(!confirm("Bu borç/alacak ve ödeme geçmişi silinsin mi?"))return;await s.from("payments").delete().eq("account_id",id).eq("user_id",u.id);const r=await s.from("accounts").delete().eq("id",id).eq("user_id",u.id);if(r.error)alert(r.error.message);else{q("#accountDetailDialog")?.close();load()}}

qa("[data-ledger-tab]").forEach(b=>b.addEventListener("click",()=>{ledgerTab=b.dataset.ledgerTab;renderLedger()}));
q("#ledgerAdd")?.addEventListener("click",()=>open(ledgerTab));q("#search")?.addEventListener("input",renderLedger);
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

q("#signIn")?.addEventListener("click",async()=>{const r=await s.auth.signInWithPassword({email:q("#email").value,password:q("#password").value});q("#authMsg").textContent=r.error?r.error.message:"";if(!r.error){u=r.data.user;view(true);startRealtime();load()}});
q("#signUp")?.addEventListener("click",async()=>{const r=await s.auth.signUp({email:q("#email").value,password:q("#password").value});q("#authMsg").textContent=r.error?r.error.message:"Hesap oluşturuldu. E-postanı doğrula."});
q("#signOut")?.addEventListener("click",async()=>{await s.auth.signOut();u=null;view(false)});
function startRealtime(){if(!u||rtChannel)return;rtChannel=s.channel("finance-live").on("postgres_changes",{event:"*",schema:"public",table:"transactions",filter:"user_id=eq."+u.id},load).on("postgres_changes",{event:"*",schema:"public",table:"accounts",filter:"user_id=eq."+u.id},load).on("postgres_changes",{event:"*",schema:"public",table:"payments",filter:"user_id=eq."+u.id},load).subscribe(st=>{if(st==="SUBSCRIBED")toast("Canlı senkronizasyon aktif")})}
s.auth.onAuthStateChange((_e,session)=>{u=session?.user||null;if(u){view(true);startRealtime();load()}else view(false)});
(async()=>{const r=await s.auth.getSession();u=r.data.session?.user||null;view(!!u);await refreshMarketRates();if(u){startRealtime();load()}setInterval(refreshMarketRates,60000)})();