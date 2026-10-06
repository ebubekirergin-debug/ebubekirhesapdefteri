(()=>{
const input=document.querySelector("#excelImport"); if(!input)return;
const norm=v=>String(v??"").trim();
const upper=v=>norm(v).toLocaleUpperCase("tr-TR");
const date=v=>{if(!v)return null;if(v instanceof Date)return v.toISOString().slice(0,10);const d=new Date(v);return isNaN(d)?null:d.toISOString().slice(0,10)};
const rows=(wb,name)=>{const ws=wb.Sheets[name];return ws?XLSX.utils.sheet_to_json(ws,{range:1,defval:"",raw:true}):[]};
const summaryRates=wb=>{
 const ws=wb.Sheets["Finans Özeti"]; if(!ws)return {USD:null,EUR:null,GOLD:null};
 const grid=XLSX.utils.sheet_to_json(ws,{header:1,defval:"",raw:true});
 const get=label=>{const r=grid.find(x=>norm(x[0])===label);return r?Number(r[1]||0):0};
 return {USD:get("Dolar (1 USD)")||null,EUR:get("Euro (1 EUR)")||null,GOLD:get("Gram Altın")||null};
};
input.addEventListener("change",async e=>{
 const file=e.target.files?.[0]; if(!file||!u)return;
 try{
  const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});
  const rates=summaryRates(wb);
  const debts=rows(wb,"Borçlar"), recs=rows(wb,"Alacaklar"), incomes=rows(wb,"Gelirler"), expenses=rows(wb,"Giderler"), hist=rows(wb,"Ödeme Geçmişi");
  const salary=rows(wb,"Maaş Geçmişi"), monthly=rows(wb,"Aylık Öngörü"), yearly=rows(wb,"Yıllık Öngörü");
  if(!confirm("Excel ayrıntıları bulundu. "+debts.length+" borç, "+recs.length+" alacak, "+hist.length+" ödeme/tahsilat kaydı ve diğer finans bölümleri okunacak. Aynı dosyayı daha önce aktardıysan çift kayıt oluşabilir. Devam?"))return;

  const existing=(await s.from("accounts").select("id,title,party_name,record_type,original_amount,currency,start_date").eq("user_id",u.id)).data||[];
  const accountRows=[...debts.map(x=>({x,type:"borc",party:x["Ödeme Yapılacak Kişi / Kurum"]||x["Başlık"]})),...recs.map(x=>({x,type:"alacak",party:x["Borçlu Kişi / Kurum"]||x["Başlık"]}))];
  const inserted=[];
  for(const z of accountRows){
    const x=z.x, amount=Number(x["İlk Tutar"]||0); if(!(amount>0))continue;
    const currency=norm(x["Birim"]||"TRY");
    const start=date(x["Başlangıç"]);
    const duplicate=existing.find(a=>a.record_type===z.type&&upper(a.party_name)===upper(z.party)&&Number(a.original_amount)===amount&&norm(a.currency)===currency&&String(a.start_date||"")===String(start||""));
    if(duplicate){inserted.push({...duplicate,record_type:z.type,party_name:z.party});continue}
    const remaining=Number(x["Kalan"]??amount), remainingTry=Number(x["Kalan TL Karşılığı"]||0), paid=Number(x[z.type==="borc"?"Ödenen":"Tahsil Edilen"]||0);
    let baseRate=null;
    if(currency==="TRY") baseRate=1;
    else if(remaining>0&&remainingTry>0) baseRate=remainingTry/remaining;
    else baseRate=rates[currency]||null;
    const payload={
      user_id:u.id,
      title:norm(x["Başlık"]||z.party),
      party_name:norm(z.party),
      record_type:z.type,
      debt_kind:norm(x["Cins"]||"Genel"),
      currency,
      original_amount:amount,
      start_date:start,
      note:norm(x["Notlar"]),
      status:norm(x["Durum"]),
      imported_paid:paid,
      imported_remaining:remaining,
      imported_remaining_try:remainingTry,
      imported_transaction_count:Number(x["İşlem Sayısı"]||0),
      source_tag:"Excel",
      base_rate:baseRate,
      base_try_amount:baseRate?amount*baseRate:null,
      asset_type:currency==="GOLD"?"GOLD":null,
      asset_quantity:currency==="GOLD"?amount:null
    };
    const ins=await s.from("accounts").insert(payload).select("*").single();
    if(ins.error)throw ins.error; inserted.push(ins.data);
  }

  for(const pair of [[incomes,"gelir","Gelir Cinsi"],[expenses,"gider","Gider Cinsi"]]){
    for(const x of pair[0]){
      const amount=Number(x["Tutar"]||0); if(!(amount>0))continue;
      const currency=norm(x["Birim"]||"TRY"), tryValue=Number(x["TL Karşılığı"]||0);
      const desc=norm(x["Başlık"]||x["Kişi / Kurum"]||"İşlem"), txDate=date(x["Tarih"])||new Date().toISOString().slice(0,10);
      const dup=(await s.from("transactions").select("id").eq("user_id",u.id).eq("type",pair[1]).eq("description",desc).eq("transaction_date",txDate).eq("amount",amount).limit(1)).data||[];
      if(dup.length)continue;
      const r=await s.from("transactions").insert({
        user_id:u.id,type:pair[1],transaction_date:txDate,description:desc,category:norm(x[pair[2]]||"Genel"),
        amount,currency,try_value:tryValue||null,status:norm(x["Durum"]),note:norm(x["Notlar"])
      });
      if(r.error)throw r.error;
    }
  }

  const acs=(await s.from("accounts").select("*").eq("user_id",u.id)).data||[];
  for(const x of hist){
    const type=upper(x["İşlem Türü"]).includes("ALACAK")?"alacak":"borc";
    const keys=[upper(x["Ana Kayıt"]),upper(x["Kişi / Kurum"])].filter(Boolean);
    const a=acs.find(v=>v.record_type===type&&(keys.includes(upper(v.title))||keys.includes(upper(v.party_name))));
    const amount=Number(x["Miktar"]||0); if(!a||!(amount>0))continue;
    const seq=Number(x["İşlem No"]||0)||null;
    const paymentDate=date(x["Tarih"])||a.start_date||new Date().toISOString().slice(0,10);
    const dup=(await s.from("payments").select("id").eq("user_id",u.id).eq("account_id",a.id).eq("amount",amount).eq("sequence_no",seq).limit(1)).data||[];
    if(dup.length)continue;
    const r=await s.from("payments").insert({
      user_id:u.id,account_id:a.id,payment_date:paymentDate,amount,currency:norm(x["Birim"]||a.currency||"TRY"),
      sequence_no:seq,original_try_value:Number(x["O Günkü TL Değeri"]||0)||null,note:norm(x["Açıklama"])
    });
    if(r.error)throw r.error;
  }

  localStorage.setItem("excelFinanceMeta",JSON.stringify({
    reportDate: rows(wb,"Finans Özeti")?.[0]?.["Rapor Tarihi"]||null,
    rates, salaryRows:salary.length, monthlyForecastRows:monthly.length, yearlyForecastRows:yearly.length,
    importedAt:new Date().toISOString()
  }));
  alert("Excel ayrıntıları aktarıldı. Cins, durum, birim, ilk/kalan tutar, TL karşılığı, notlar, işlem sayısı ve ödeme geçmişi korunuyor.");
  await load();e.target.value="";
 }catch(err){alert("Aktarım sırasında hata: "+(err?.message||err))}
});
})();