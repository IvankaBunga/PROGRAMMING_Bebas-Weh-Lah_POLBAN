let sched={categories:{}},catalog=[],groups=[],geoData,fares={},fareEst={categories:{}},map,routeLayer=null,pointLayer=null,selectedId=null,selectedMember=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const UNKNOWN="Angkot/minibus (belum pasti)";
function isUnknown(r){return r.mode===UNKNOWN;}
function modeClass(r){return r.mode_confidence==="confirmed"?"known":r.mode_confidence==="likely"?"likely":"";}
const rupiah=n=>"Rp "+new Intl.NumberFormat("id-ID").format(n);
function rangeText(e){return e.min===e.max?rupiah(e.min):e.min===0?"Gratis – "+rupiah(e.max):rupiah(e.min)+" – "+rupiah(e.max);}
const confLabel={kuat:"Keyakinan kuat",sedang:"Keyakinan sedang",kasar:"Estimasi kasar"};
function buildGroups(){
 const m=new Map();
 catalog.forEach(r=>{if(!m.has(r.group_id))m.set(r.group_id,[]);m.get(r.group_id).push(r);});
 groups=[...m.entries()].map(([gid,ms])=>{
  const big=ms.reduce((a,b)=>((b.stops||[]).length>(a.stops||[]).length?b:a),ms[0]);
  const seen=new Set(),stops=[];
  [big,...ms.filter(x=>x!==big)].forEach(x=>(x.stops||[]).forEach(s=>{if(!seen.has(s.name)){seen.add(s.name);stops.push(s);}}));
  const f=ms[0];
  return {gid,name:f.group_name,members:ms,stops,mode:f.mode,mode_confidence:f.mode_confidence,mode_basis:f.mode_basis,fare_key:f.fare_key,
   endpoints:(big.stops||[]).length>1?`${big.stops[0].name} → ${big.stops[big.stops.length-1].name}`:(big.stops||[]).length===1?big.stops[0].name:"Tidak ada titik bernama"};
 }).sort((a,b)=>a.name.localeCompare(b.name,"id",{numeric:true}));
}
function buildFilter(){
 const counts={};groups.forEach(r=>counts[r.mode]=(counts[r.mode]||0)+1);
 const names=Object.keys(counts).filter(m=>m!==UNKNOWN).sort((a,b)=>counts[b]-counts[a]);
 $("modeFilter").innerHTML='<option value="all">Semua kategori · '+groups.length+'</option>'+names.map(m=>`<option value="${esc(m)}">${esc(m)} · ${counts[m]}</option>`).join("")+`<option value="unknown">${UNKNOWN} · ${counts[UNKNOWN]||0}</option>`;
 const conf=k=>groups.filter(r=>r.mode_confidence===k).length;
 $("statConfirmed").textContent=conf("confirmed");$("statLikely").textContent=conf("likely");$("statUnknown").textContent=conf("unknown");
 $("statTotal").textContent=groups.length;$("statFiles").textContent=catalog.length;$("statCats").textContent=names.length;
}
async function init(){
 const [c,g,f,e,s]=await Promise.all([fetch("data/route-catalog.json").then(r=>r.json()),fetch("data/routes-geo.json").then(r=>r.json()),fetch("data/fares.json").then(r=>r.json()),fetch("data/fare-estimates.json").then(r=>r.json()),fetch("data/schedules.json").then(r=>r.json()).catch(()=>({categories:{}}))]);
 catalog=c;geoData=g;fares=f;fareEst=e;sched=s;buildGroups();buildFilter();
 map=L.map("mapview",{scrollWheelZoom:false}).setView([-6.9147,107.6098],11);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap contributors"}).addTo(map);
 renderList();
 $("routeSearch").addEventListener("input",renderList);
 $("modeFilter").addEventListener("change",renderList);
}
function filtered(){
 const q=$("routeSearch").value.trim().toLowerCase(),m=$("modeFilter").value;
 return groups.filter(r=>{
  const text=(r.name+" "+r.members.map(x=>x.file).join(" ")+" "+r.stops.map(s=>s.name).join(" ")).toLowerCase();
  const categoryOk=m==="all"||(m==="unknown"?isUnknown(r):r.mode===m);
  return categoryOk&&(!q||text.includes(q));
 });
}
function renderList(){
 const items=filtered();
 $("routeCount").textContent=`Menampilkan ${Math.min(items.length,100)} dari ${items.length} trayek · ${groups.length} trayek unik dari ${catalog.length} file KML (arah & versi digabung)`;
 $("listTitle").textContent=$("modeFilter").value==="all"?"Seluruh trayek":$("modeFilter").selectedOptions[0].textContent.split(" · ")[0];
 $("routeList").innerHTML=items.length?items.slice(0,100).map(r=>`<button class="route-item ${selectedId===r.gid?"active":""}" data-id="${esc(r.gid)}">
   <strong>${esc(r.name)}</strong>
   <div class="route-sub"><small>${esc(r.endpoints)}</small><span class="mode-chip ${modeClass(r)}">${esc(r.mode)}</span></div>
   ${r.members.length>1?`<div class="route-meta">${r.members.length} file KML (arah &amp; versi digabung)</div>`:""}
  </button>`).join(""):`<div class="empty-small">Tidak ada trayek yang cocok dengan pencarian.</div>`;
 document.querySelectorAll(".route-item").forEach(b=>b.addEventListener("click",()=>selectRoute(b.dataset.id)));
}
function schedInfo(r){
 const S=sched||{},cats=S.categories||{};let base=cats[r.fare_key]||cats.unknown||{};
 const ov=(S.overrides||{})[r.name];if(ov)base={...base,...ov};
 const m=/^Koridor (\d)/.exec(r.name);
 if(r.fare_key==="mjt"&&m&&(S.mjt_corridors||{})[m[1]])base={...base,hours:S.mjt_corridors[m[1]],conf:"sumber"};
 return base;
}
function schedHtml(r){
 const s=schedInfo(r);if(!s.hours)return `<div class="detail-metric"><span>Jam operasional</span><b>Belum tersedia</b></div><div class="detail-metric"><span>Status operasional</span><b>Belum diverifikasi</b></div>`;
 const tag=c=>c==="sumber"?'<em class="sch-tag ok">dari sumber</em>':'<em class="sch-tag est">perkiraan</em>';
 const src=s.source?` <a href="${esc(s.source.url)}" target="_blank" rel="noopener">${esc(s.source.title)}</a>`:"";
 return `<div class="detail-metric"><span>Jam operasional ${tag(s.conf)}</span><b>${esc(s.hours)}</b>${s.note?`<small class="sch-note">${esc(s.note)}</small>`:""}</div>
    <div class="detail-metric"><span>Status operasional ${tag(s.conf_status)}</span><b>${esc(s.status)}</b><small class="sch-note">Belum diverifikasi per trayek.${src}</small></div>`;
}
function renderDetail(r){
 const stops=r.stops||[];
 const dirs=r.members.map(m=>`<button class="dir-btn ${selectedMember===m.id?"active":""}" data-mid="${m.id}">${esc(m.direction)}<small>${m.code?"kode "+esc(m.code):"tanpa kode"}</small></button>`).join("");
 const vehicle=isUnknown(r)?"Angkot, angkutan pedesaan, atau Elf (belum bisa dibedakan)":r.mode+(r.mode_confidence==="likely"?" (dugaan)":"");
 const fare=(r.members.map(m=>fares[String(m.id)]).find(f=>f&&Number.isFinite(f.amount)))||{};
 const fareKnown=Number.isFinite(fare.amount)&&fare.amount>=0;
 const est=(fareEst.categories||{})[r.fare_key];
 let fareHtml;
 if(fareKnown){
  fareHtml=`<section class="fare-card fare-known"><div class="fare-top"><div><span class="fare-kicker">TARIF</span><b class="fare-price">${esc(rupiah(fare.amount))}</b></div><span class="fare-status">Tarif terverifikasi</span></div>
   <div class="fare-meta"><span>Jenis tarif: <b>${esc(fare.type||"Belum diketahui")}</b></span><span>Sumber: <b>${esc(fare.source||"Belum dicantumkan")}</b></span><span>Verifikasi: <b>${esc(fare.verified_at||"Belum ada")}</b></span></div>
   <p>${esc(fare.notes||"")}</p></section>`;
 }else if(est){
  const src=(est.sources||[]).map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>`).join(" · ")||"Belum ada sumber (perkiraan)";
  fareHtml=`<section class="fare-card fare-estimate conf-${esc(est.confidence)}"><div class="fare-top"><div><span class="fare-kicker">ESTIMASI TARIF · BUKAN TARIF RESMI</span><b class="fare-price">${esc(rangeText(est))}</b></div><span class="fare-status">${esc(confLabel[est.confidence]||"Estimasi")}</span></div>
   <div class="fare-meta"><span>Dasar estimasi: <b>kategori ${esc(est.label)}</b></span><span>Sumber: <b>${src}</b></span><span>Dicek: <b>${esc(fareEst._meta?.researched_at||"-")}</b></span></div>
   <p>${esc(est.basis)} Tarif sebenarnya bisa berbeda tergantung jarak, operator, dan kebijakan terbaru.</p></section>`;
 }else{
  fareHtml=`<section class="fare-card fare-pending"><div class="fare-top"><div><span class="fare-kicker">TARIF</span><b class="fare-price">Belum tersedia</b></div><span class="fare-status">Menunggu verifikasi</span></div></section>`;
 }
 const stopsHtml=stops.length?stops.map((s,i)=>`<div class="stop-row"><i class="stop-dot"></i><div><b>${esc(s.name)}</b><small>${s.coordinates[1].toFixed(5)}, ${s.coordinates[0].toFixed(5)} · titik tercatat di KML</small></div></div>`).join(""):`<p class="detail-desc">Tidak ada fitur titik bernama yang tercatat pada metadata trayek ini. Garis geometri tetap tersedia di peta.</p>`;
 $("detailPanel").innerHTML=`<div class="detail-card">
  <div class="detail-main">
   <div class="detail-kicker">DETAIL TRAYEK · ${r.members.length} FILE KML</div>
   <h3>${esc(r.name)}</h3>
   <p class="detail-desc">Arah pergi-pulang dan versi data yang sama sudah digabung jadi satu trayek. Nama mengikuti nama file sumber. Jenis kendaraan dibaca dari nama file dan nama titik; kategori bertanda “dugaan” adalah inferensi dari pola penamaan, bukan data resmi.</p>
   <div class="detail-grid">
    <div class="detail-metric"><span>Jenis kendaraan</span><b>${esc(vehicle)}</b></div>
    <div class="detail-metric detail-wide"><span>Dasar klasifikasi · ${r.mode_confidence==="confirmed"?"terkonfirmasi dari nama":r.mode_confidence==="likely"?"dugaan":"belum jelas"}</span><b class="basis">${esc(r.mode_basis)}</b></div>
    <div class="detail-metric"><span>Titik bernama dalam file</span><b>${stops.length}</b></div>
    <div class="detail-metric"><span>File KML digabung</span><b>${r.members.length}</b></div>
    ${schedHtml(r)}
   </div>
   <div class="dir-box"><span>ARAH &amp; VERSI DATA · klik untuk menyorot satu file</span><div class="dir-list">${dirs}</div></div>
   ${fareHtml}
   <div class="missing-note"><b>Catatan:</b> ${stops.length} titik adalah fitur Point bernama yang ada di file, bukan jaminan seluruh halte di sepanjang trayek.</div>
  </div>
  <aside class="detail-side"><h4>Titik yang tercatat di file</h4><div class="stop-list">${stopsHtml}</div><div class="missing-note">KML tidak menyediakan konfirmasi otomatis tentang arah layanan, kendaraan yang sedang beroperasi, tarif, jadwal, atau status aktif saat ini.</div></aside>
 </div>`;
}
function drawRoute(r){
 if(routeLayer)map.removeLayer(routeLayer);
 const ids=new Set(r.members.map(m=>m.id));
 const feats=geoData.features.filter(x=>ids.has(x.properties.id));
 if(!feats.length)return false;
 routeLayer=L.geoJSON({type:"FeatureCollection",features:feats},{style:f=>{const on=selectedMember===null||f.properties.id===selectedMember;return {color:"#2864ff",weight:on?5:3,opacity:on?.92:.3,lineCap:"round",lineJoin:"round"};},onEachFeature:(f,layer)=>layer.bindPopup(`<b>${esc(r.name)}</b><br><small>${esc((catalog.find(x=>x.id===f.properties.id)||{}).direction||"")}</small>`)}).addTo(map);
 return true;
}
function wireDirButtons(r){
 document.querySelectorAll(".dir-btn").forEach(b=>b.addEventListener("click",()=>{const id=+b.dataset.mid;selectedMember=selectedMember===id?null:id;drawRoute(r);renderDetail(r);wireDirButtons(r);}));
}
function scrollToDetail(){
 const el=$("detail-section");if(!el||!el.scrollIntoView)return;
 const calm=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
 requestAnimationFrame(()=>el.scrollIntoView({behavior:calm?"auto":"smooth",block:"start"}));
}
function selectRoute(gid){
 selectedId=gid;selectedMember=null;const r=groups.find(x=>x.gid===gid);if(!r)return;
 if(pointLayer)map.removeLayer(pointLayer);
 if(!drawRoute(r)){$("detailPanel").innerHTML='<div class="detail-empty">Geometri untuk trayek ini tidak ditemukan di GeoJSON.</div>';return;}
 pointLayer=L.layerGroup();
 r.stops.forEach(s=>{const [lng,lat]=s.coordinates;L.circleMarker([lat,lng],{radius:6,color:"#fff",weight:2,fillColor:"#ff8c61",fillOpacity:1}).bindPopup(`<b>${esc(s.name)}</b><br><small>Point dari file KML</small>`).addTo(pointLayer);});
 pointLayer.addTo(map);
 const bounds=routeLayer.getBounds();if(bounds.isValid())map.fitBounds(bounds.pad(.16));
 $("mapRouteName").textContent=r.name;
 renderDetail(r);wireDirButtons(r);renderList();
 scrollToDetail();
}
init().catch(err=>{$("routeCount").textContent="Gagal memuat data. Jalankan website melalui Live Server.";console.error(err);});
