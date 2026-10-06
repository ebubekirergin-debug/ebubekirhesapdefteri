(()=>{
const input=document.querySelector("#excelImport"); if(!input)return;
const norm=v=>String(v??"").trim();
const date=v=>{if(!v)return new Date().toISOString().slice(0,10);if(v instanceof Date)return v.toISOString().slice(0,10);const d=new Date(v);return isNaN(d)?new Date().toISOString().slice(0,10):d.toISOString().slice(0,10)};
const rows=(wb,name)=>{const ws=wb.Sheets[name];return ws?XLSX.utils.sheet_to_json(ws,{range:1,defval:"",raw:true}):[]};
input.addEventListener("change",async e=>{
 const file=e.target.files?.[0]; if(!file||!u)return;
 try{
  const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});
  const debts=rows(wb,"Borçlar"), recs=rows(wb,"Alacaklar"), incomes=rows(wb,"Gelirler"), expenses=rows(wb,"Giderler"), hist=rows(wb,"Ödeme Geçmişi");
  if(!confirm("Excel bulundu. "+debts.length+" borç, "+recs.length+" alacak, "+incomes.length+" gelir, "+expenses.length+" gider kaydı aktarılacak. Devam edilsin mi?"))return;
  const accountRows=[...debts.map(x=>({x,type:"borc",party:x["Ödeme Yapılacak Kişi / Kurum"]||x["Başlık"]})),...recs.map(x=>({x,type:"alacak",party:x["Borçlu Kişi / Kurum"]||x["Başlık"]}))];
  for(const z of accountRows){const x=z.x;if(!+x["İlk Tutar"])continue;await s.from("accounts").insert({user_id:u.id,party_name:norm(z.party),record_type:z.type,debt_kind:norm(x["Cins"]||"Genel"),currency:norm(x["Birim"]||"TRY"),original_amount:+x["İlk Tutar"],start_date:date(x["Başlangıç"]),note:norm(x["Notlar"])});}
  for(const pair of [[incomes,"gelir","Gelir Cinsi"],[expenses,"gider","Gider Cinsi"]])for(const x of pair[0]){if(!+x["Tutar"])continue;await s.from("transactions").insert({user_id:u.id,type:pair[1],transaction_date:date(x["Tarih"]),description:norm(x["Başlık"]||x["Kişi / Kurum"]||"İşlem"),category:norm(x[pair[2]]||"Genel"),amount:+x["Tutar"],currency:norm(x["Birim"]||"TRY"),note:norm(x["Notlar"])});}
  const {data:acs}=await s.from("accounts").select("*").eq("user_id",u.id);
  for(const x of hist){const a=(acs||[]).find(v=>norm(v.party_name).toLocaleUpperCase("tr-TR")===norm(x["Kişi / Kurum"]||x["Ana Kayıt"]).toLocaleUpperCase("tr-TR")&&v.record_type===(norm(x["İşlem Türü"]).toLowerCase().includes("alacak")?"alacak":"borc"));if(!a||!+x["Miktar"])continue;await s.from("payments").insert({user_id:u.id,account_id:a.id,payment_date:date(x["Tarih"]||a.start_date),amount:+x["Miktar"],currency:norm(x["Birim"]||"TRY"),note:norm(x["Açıklama"])});}
  alert("Excel aktarımı tamamlandı.");await load();e.target.value="";
 }catch(err){alert("Aktarım sırasında hata: "+err.message)}
});
})();