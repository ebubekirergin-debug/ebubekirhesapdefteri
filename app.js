const U="https://dduzyusrwiybvphvkzpt.supabase.co",K="sb_publishable_-mn0WgU0J3pE_NnOX1kIsg_Eq3m-7aR",s=supabase.createClient(U,K),q=x=>document.querySelector(x),f=new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY"});let u,T=[],A=[],P=[];
const m=n=>f.format(+n||0),day=()=>new Date().toISOString().slice(0,10),paid=id=>P.filter(x=>x.account_id===id).reduce((a,x)=>a+(+x.amount),0),rem=a=>Math.max(0,+a.original_amount-paid(a.id));
function view(ok){q("#authView").classList.toggle("hidden",ok);q("#appView").classList.toggle("hidden",!ok)}
async function load(){let [t,a,p]=await Promise.all([s.from("transactions").select("*").eq("user_id",u.id).order("transaction_date",{ascending:false}),s.from("accounts").select("*").eq("user_id",u.id),s.from("payments").select("*").eq("user_id",u.id)]);T=t.data||[];A=a.data||[];P=p.data||[];render()}
function render(){let d=new Date(),ym=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"),i=T.filter(x=>x.type==="gelir"&&x.transaction_date.startsWith(ym)).reduce((a,x)=>a+(+x.amount),0),e=T.filter(x=>x.type==="gider"&&x.transaction_date.startsWith(ym)).reduce((a,x)=>a+(+x.amount),0),r=A.filter(x=>x.record_type==="alacak").reduce((z,x)=>z+rem(x),0),b=A.filter(x=>x.record_type==="borc").reduce((z,x)=>z+rem(x),0);q("#monthIncome").textContent=m(i);q("#monthExpense").textContent=m(e);q("#receivable").textContent=m(r);q("#debt").textContent=m(b);q("#net").textContent=m(i-e+r-b);tx();acc()}
function tx(){let z=q("#search").value.toLowerCase(),x=T.filter(v=>(v.description+" "+(v.category||"")).toLowerCase().includes(z));q("#transactions").innerHTML=x.length?x.slice(0,50).map(v=>'<div class="row"><div><b>'+safe(v.description||"İşlem")+'</b><small>'+safe(v.category||"Genel")+" · "+v.transaction_date+'</small></div><strong class="'+(v.type==="gelir"?"pos":"neg")+'">'+(v.type==="gelir"?"+":"-")+m(v.amount)+"</strong></div>").join(""):'<div class="empty">Henüz işlem yok.</div>'}
function acc(){let x=A.filter(v=>rem(v)>0);q("#accounts").innerHTML=x.length?x.map(v=>'<div class="account"><h3>'+safe(v.party_name)+'</h3><p>'+(v.record_type==="alacak"?"Alacak":"Borç")+'</p><div class="amount '+(v.record_type==="alacak"?"pos":"neg")+'">'+m(rem(v))+'</div><button data-pay="'+v.id+'">'+(v.record_type==="alacak"?"Tahsilat işle":"Ödeme işle")+"</button></div>").join(""):'<div class="empty">Açık hesap yok.</div>'}
function safe(v){return String(v||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
q("#signIn").onclick=async()=>{let r=await s.auth.signInWithPassword({email:q("#email").value,password:q("#password").value});q("#authMsg").textContent=r.error?r.error.message:"";if(!r.error){u=r.data.user;view(1);load()}};
q("#signUp").onclick=async()=>{let r=await s.auth.signUp({email:q("#email").value,password:q("#password").value});q("#authMsg").textContent=r.error?r.error.message:"Hesap oluşturuldu. E-postanı doğrula."};
q("#signOut").onclick=async()=>{await s.auth.signOut();u=null;view(0)};q("#search").oninput=tx;
document.addEventListener("click",e=>{let k=e.target.closest("[data-kind]");if(k)open(k.dataset.kind);let p=e.target.closest("[data-pay]");if(p)pay(+p.dataset.pay)});
function open(k){q("#kind").value=k;q("#amount").value="";q("#description").value="";q("#date").value=day();q("#category").value="Genel";q("#note").value="";q("#entryTitle").textContent=({gelir:"Gelir ekle",gider:"Gider ekle",alacak:"Alacak ekle",borc:"Borç ekle"})[k];q("#entryDialog").showModal()}
q("#closeEntry").onclick=()=>q("#entryDialog").close();
q("#entryForm").onsubmit=async e=>{e.preventDefault();let k=q("#kind").value,o;if(k==="gelir"||k==="gider")o=await s.from("transactions").insert({user_id:u.id,type:k,transaction_date:q("#date").value,description:q("#description").value,category:q("#category").value,amount:+q("#amount").value,currency:"TRY",note:q("#note").value});else o=await s.from("accounts").insert({user_id:u.id,party_name:q("#description").value,record_type:k,debt_kind:"Genel",currency:"TRY",original_amount:+q("#amount").value,start_date:q("#date").value,note:q("#note").value});if(o.error)return alert(o.error.message);q("#entryDialog").close();load()};
function pay(id){let a=A.find(x=>x.id===id);q("#accountId").value=id;q("#paymentTitle").textContent=a.record_type==="alacak"?"Tahsilat işle":"Ödeme işle";q("#paymentAmount").value=rem(a);q("#paymentDate").value=day();q("#paymentNote").value="";q("#paymentDialog").showModal()}
q("#closePayment").onclick=()=>q("#paymentDialog").close();q("#paymentForm").onsubmit=async e=>{e.preventDefault();let id=+q("#accountId").value,a=A.find(x=>x.id===id),v=+q("#paymentAmount").value;if(v<=0||v>rem(a))return alert("Tutar geçersiz");let r=await s.from("payments").insert({user_id:u.id,account_id:id,payment_date:q("#paymentDate").value,amount:v,currency:"TRY",note:q("#paymentNote").value});if(r.error)return alert(r.error.message);q("#paymentDialog").close();load()};
(async()=>{let r=await s.auth.getSession();u=r.data.session?.user||null;view(!!u);if(u)load()})();
let rtChannel=null;
function startRealtime(){
  if(!u||rtChannel)return;
  rtChannel=s.channel("finance-live")
    .on("postgres_changes",{event:"*",schema:"public",table:"transactions",filter:"user_id=eq."+u.id},()=>load())
    .on("postgres_changes",{event:"*",schema:"public",table:"accounts",filter:"user_id=eq."+u.id},()=>load())
    .on("postgres_changes",{event:"*",schema:"public",table:"payments",filter:"user_id=eq."+u.id},()=>load())
    .subscribe(status=>{
      const t=q("#toast");
      if(status==="SUBSCRIBED"&&t){t.textContent="Canlı senkronizasyon aktif";t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1400)}
    });
}
s.auth.onAuthStateChange((event,session)=>{
  u=session?.user||null;
  if(u){view(true);startRealtime();load()}
  else{if(rtChannel){s.removeChannel(rtChannel);rtChannel=null}view(false)}
});

/* dashboardUpgradeV3 */
const _baseRender = render;
render = function(){
  _baseRender();
  const open = A.filter(x=>rem(x)>0);
  const rec = open.filter(x=>x.record_type==="alacak");
  const debts = open.filter(x=>x.record_type==="borc");
  const set=(id,val)=>{const el=q(id); if(el) el.textContent=val};
  set("#recCount", rec.length+" kayıt");
  set("#debtCount", debts.length+" kayıt");
  set("#txCount", T.length);
  set("#openCount", open.length);
  set("#payCount", P.length);
  set("#largestDebt", m(debts.reduce((mx,x)=>Math.max(mx,rem(x)),0)));
  const onboarding=q("#emptyOnboarding");
  if(onboarding) onboarding.classList.toggle("hidden", !(T.length===0 && A.length===0));
};
q("#accountFilter")?.addEventListener("change",()=>{
  const f=q("#accountFilter").value;
  const all=A.filter(v=>rem(v)>0 && (f==="all" || v.record_type===f));
  q("#accounts").innerHTML=all.length?all.map(v=>'<div class="account"><h3>'+safe(v.party_name)+'</h3><p>'+(v.record_type==="alacak"?"Alacak":"Borç")+'</p><div class="amount '+(v.record_type==="alacak"?"pos":"neg")+'">'+m(rem(v))+'</div><button data-pay="'+v.id+'">'+(v.record_type==="alacak"?"Tahsilat işle":"Ödeme işle")+'</button></div>').join(""):'<div class="empty">Açık hesap yok.</div>';
});

/* editDeleteV4 */
document.addEventListener("click",async e=>{
 const editTx=e.target.closest("[data-edit-tx]"), delTx=e.target.closest("[data-del-tx]"), editAcc=e.target.closest("[data-edit-acc]"), delAcc=e.target.closest("[data-del-acc]");
 if(editTx){const x=T.find(v=>v.id==editTx.dataset.editTx);if(!x)return;const d=prompt("Açıklama",x.description);if(d===null)return;const a=prompt("Tutar",x.amount);if(a===null||!(+a>0))return;const c=prompt("Kategori",x.category||"Genel");const r=await s.from("transactions").update({description:d,amount:+a,category:c||"Genel"}).eq("id",x.id).eq("user_id",u.id);if(r.error)alert(r.error.message);else load();}
 if(delTx){if(!confirm("Bu gelir/gider kaydı silinsin mi?"))return;const r=await s.from("transactions").delete().eq("id",+delTx.dataset.delTx).eq("user_id",u.id);if(r.error)alert(r.error.message);else load();}
 if(editAcc){const x=A.find(v=>v.id==editAcc.dataset.editAcc);if(!x)return;const n=prompt("Kişi / kurum",x.party_name);if(n===null)return;const a=prompt("Toplam tutar",x.original_amount);if(a===null||!(+a>0))return;const r=await s.from("accounts").update({party_name:n,original_amount:+a}).eq("id",x.id).eq("user_id",u.id);if(r.error)alert(r.error.message);else load();}
 if(delAcc){if(!confirm("Bu borç/alacak ve bağlı ödeme kayıtları silinsin mi?"))return;const id=+delAcc.dataset.delAcc;await s.from("payments").delete().eq("account_id",id).eq("user_id",u.id);const r=await s.from("accounts").delete().eq("id",id).eq("user_id",u.id);if(r.error)alert(r.error.message);else load();}
});
const _txV4=tx;tx=function(){_txV4();q("#transactions").querySelectorAll(".row").forEach((el,i)=>{const z=q("#search").value.toLowerCase(),list=T.filter(v=>(v.description+" "+(v.category||"")).toLowerCase().includes(z)).slice(0,50),v=list[i];if(v)el.insertAdjacentHTML("beforeend",'<div class="actions"><button data-edit-tx="'+v.id+'">Düzenle</button><button data-del-tx="'+v.id+'">Sil</button></div>')})};
const _accV4=acc;acc=function(){_accV4();q("#accounts").querySelectorAll(".account").forEach((el,i)=>{const list=A.filter(v=>rem(v)>0),v=list[i];if(v)el.insertAdjacentHTML("beforeend",'<div class="actions"><button data-edit-acc="'+v.id+'">Düzenle</button><button data-del-acc="'+v.id+'">Sil</button></div>')})};
