// Fitur "Cari Rute": asal -> tujuan, urutan trayek yang dinaiki + titik oper.
// Berdiri sendiri: hanya MEMBACA data dari app.js (groups, geoData, fareEst) dan data/planner-index.json.
// Dibangun dari kedekatan geometri jalur di KML, bukan dari jadwal/arah resmi.
(function(){
const COL=["#2864ff","#e4572e","#17a673","#8e44ad"];
const WALK_MAX=700,MAX_LEGS=3;
const P={idx:null,gmap:new Map(),adj:new Map(),feat:null,picked:{},pickMode:null,map:null,layer:null,opts:[],sel:0,mk:{}};
const q=id=>document.getElementById(id);
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rp=n=>"Rp "+new Intl.NumberFormat("id-ID").format(n);
const dist=(a,b)=>{const k=Math.PI/180,x=(b[1]-a[1])*k*Math.cos((a[0]+b[0])*k/2),y=(b[0]-a[0])*k;return 6371000*Math.hypot(x,y);};
const norm=s=>String(s).toLowerCase().replace(/\s+/g," ").trim();
const meters=m=>m>=1000?(m/1000).toFixed(1).replace(".",",")+" km":Math.round(m/10)*10+" m";

function nearestPt(gid,p){let best=null,bd=1e12;for(const c of P.idx.groups[gid]){const m=dist(p,c);if(m<bd){bd=m;best=c;}}return{pt:best,d:bd};}
function nearGroups(p){const out=[];for(const gid in P.idx.groups){const n=nearestPt(gid,p);if(n.d<=WALK_MAX)out.push({gid,pt:n.pt,d:n.d});}return out;}
function placeName(p){let b=null,bd=1e12;for(const pl of P.idx.places){const m=dist(p,[pl[1],pl[2]]);if(m<bd){bd=m;b=pl;}}
 return bd<=1200?"dekat "+b[0]:"titik temu jalur ("+p[0].toFixed(4)+", "+p[1].toFixed(4)+")";}

function resolve(kind){
 const el=q(kind==="from"?"planFrom":"planTo"),v=el.value.trim(),pk=P.picked[kind];
 if(!v)return null;
 if(pk&&pk.label===v)return{pt:pk.pt,label:v};
 const n=norm(v),pl=P.idx.places;
 const hit=pl.find(x=>norm(x[0])===n)||pl.find(x=>norm(x[0]).includes(n));
 return hit?{pt:[hit[1],hit[2]],label:hit[0]}:null;
}

function pickTp(list,o,t){let b=list[0],bs=1e12;for(const p of list){const s=dist(o,p)+dist(p,t);if(s<bs){bs=s;b=p;}}return b;}

function search(o,t){
 const S=nearGroups(o),Eg=new Map(nearGroups(t).map(x=>[x.gid,x])),found=[];
 const dfs=(path,tps)=>{
  const last=path[path.length-1];
  if(Eg.has(last)){found.push({path:[...path],tps:[...tps]});return;}
  if(path.length>=MAX_LEGS)return;
  for(const[nb,list]of P.adj.get(last)||[]){if(path.includes(nb))continue;path.push(nb);tps.push(pickTp(list,o,t));dfs(path,tps);path.pop();tps.pop();}
 };
 S.forEach(s=>dfs([s.gid],[]));
 const sm=new Map(S.map(x=>[x.gid,x]));
 found.forEach(f=>{
  const w0=sm.get(f.path[0]).d,w1=Eg.get(f.path[f.path.length-1]).d;
  let ride=0,prev=o;f.tps.forEach(p=>{ride+=dist(prev,p);prev=p;});ride+=dist(prev,t);
  f.walk=w0+w1;f.w0=w0;f.w1=w1;f.score=f.path.length*3000+f.walk+ride*.5;
 });
 found.sort((a,b)=>a.score-b.score);
 const seen=new Set(),out=[];
 for(const f of found){const k=f.path.join(">");if(seen.has(k))continue;seen.add(k);out.push(f);if(out.length>=3)break;}
 return out;
}

function buildOption(f,o,t){
 const legs=f.path.map((gid,i)=>{
  const g=P.gmap.get(gid);
  const bp=i===0?nearestPt(gid,o).pt:f.tps[i-1];
  const ap=i===f.path.length-1?nearestPt(gid,t).pt:f.tps[i];
  return{gid,g,bp,ap,bn:i===0?null:placeName(bp),an:i===f.path.length-1?null:placeName(ap)};
 });
 let min=0,max=0,unk=0;
 legs.forEach(l=>{const e=(fareEst.categories||{})[l.g.fare_key];if(e&&l.g.fare_key!=="unknown"){min+=e.min;max+=e.max;}else{unk++;
  const a=(fareEst.categories||{}).angkot;if(a){min+=a.min;max+=a.max;}}});
 return{f,legs,min,max,unk};
}

function modeLabel(g){return g.mode===UNKNOWN?"Angkot/minibus (belum pasti)":g.mode+(g.mode_confidence==="likely"?" (dugaan)":"");}

function renderOptions(o,t,lo,lt){
 const box=q("planResult");
 if(!P.opts.length){box.innerHTML=`<div class="plan-empty"><b>Belum ketemu rute yang nyambung.</b><p>Di data KML, tidak ada rangkaian trayek (maks. ${MAX_LEGS-1} kali oper) yang lewat dalam ${WALK_MAX} m dari kedua titik. Coba pilih titik lain yang lebih dekat jalur trayek, atau klik langsung di peta.</p></div>`;return;}
 box.innerHTML=P.opts.map((op,i)=>{
  const n=op.legs.length,steps=[];
  steps.push(`<div class="pstep walk"><i>●</i><div><b>Mulai: ${E(lo)}</b><small>Jalan kaki sekitar ${meters(op.f.w0)} ke jalur ${E(op.legs[0].g.name)}</small></div></div>`);
  op.legs.forEach((l,j)=>{
   steps.push(`<div class="pstep ride" style="--c:${COL[j%4]}"><i>${j+1}</i><div><b>Naik ${E(l.g.name)}</b><span class="mode-chip ${modeClass(l.g)}">${E(modeLabel(l.g))}</span>
    <small>${l.bn?"Naik di "+E(l.bn):"Naik di titik terdekat dari asal"} → ${l.an?"turun di "+E(l.an):"turun di titik terdekat dari tujuan"}</small></div></div>`);
   if(j<n-1)steps.push(`<div class="pstep xfer"><i>⇄</i><div><b>Oper di ${E(l.an)}</b><small>Cari tempat naik ${E(op.legs[j+1].g.name)} di sekitar situ</small></div></div>`);
  });
  steps.push(`<div class="pstep walk"><i>●</i><div><b>Sampai: ${E(lt)}</b><small>Jalan kaki sekitar ${meters(op.f.w1)} dari jalur ${E(op.legs[n-1].g.name)}</small></div></div>`);
  const fare=op.min===op.max?rp(op.min):rp(op.min)+" – "+rp(op.max);
  return`<article class="plan-opt ${i===P.sel?"on":""}" data-i="${i}"><div class="plan-opt-top"><div><span class="plan-kicker">OPSI ${i+1}${i===0?" · PALING SEDERHANA":""}</span><b>${n} trayek · ${n-1===0?"tanpa oper":n-1+" kali oper"}</b></div>
   <div class="plan-fare"><small>Estimasi total</small><b>${fare}</b></div></div>
   <div class="plan-steps">${steps.join("")}</div>
   <p class="plan-note">Jalan kaki total ±${meters(op.f.walk)}.${op.unk?` ${op.unk} trayek jenisnya belum jelas, dihitung dengan kisaran tarif angkot.`:""} Tarif integrasi/transfer belum diperhitungkan.</p></article>`;
 }).join("")+`<div class="missing-note"><b>Baca ini dulu:</b> rute disusun dari kedekatan jalur di data KML. Arah operasional, jadwal, dan apakah trayek masih beroperasi belum terverifikasi. Cek lagi ke sopir atau Dishub sebelum berangkat. Garis di peta menampilkan jalur penuh trayek, kamu hanya naik sebagian.</div>`;
 box.querySelectorAll(".plan-opt").forEach(a=>a.addEventListener("click",()=>{P.sel=+a.dataset.i;box.querySelectorAll(".plan-opt").forEach(x=>x.classList.toggle("on",x===a));draw(o,t);}));
}

function featsOf(gid){
 if(!P.feat){P.feat=new Map();const byId=new Map(geoData.features.map(f=>[f.properties.id,f]));groups.forEach(g=>P.feat.set(g.gid,g.members.map(m=>byId.get(m.id)).filter(Boolean)));}
 return P.feat.get(gid)||[];
}
const pin=(ll,txt,cls)=>L.marker(ll,{icon:L.divIcon({className:"",html:`<div class="plan-pin ${cls}">${txt}</div>`,iconSize:[26,26],iconAnchor:[13,13]})});
function draw(o,t){
 P.layer.clearLayers();const op=P.opts[P.sel];if(!op)return;
 op.legs.forEach((l,j)=>{
  L.geoJSON({type:"FeatureCollection",features:featsOf(l.gid)},{style:{color:COL[j%4],weight:5,opacity:.85,lineCap:"round"}}).bindPopup(`<b>${E(l.g.name)}</b>`).addTo(P.layer);
  if(j>0)pin(l.bp,"⇄","x").bindPopup("Titik oper").addTo(P.layer);
 });
 pin(o,"A","a").addTo(P.layer);pin(t,"B","b").addTo(P.layer);
 const b=P.layer.getBounds();if(b.isValid())P.map.fitBounds(b.pad(.15));
}

function go(){
 const err=q("planErr");err.textContent="";
 const a=resolve("from"),b=resolve("to");
 if(!a||!b){err.textContent=!q("planFrom").value.trim()||!q("planTo").value.trim()?"Isi asal dan tujuan dulu ya.":"Tempat itu belum dikenal. Pilih dari saran yang muncul, atau klik “Pilih di peta”.";return;}
 if(dist(a.pt,b.pt)<400){q("planResult").innerHTML=`<div class="plan-empty"><b>Dekat banget.</b><p>Asal dan tujuan cuma sekitar ${meters(dist(a.pt,b.pt))}, jalan kaki saja lebih praktis.</p></div>`;return;}
 P.opts=search(a.pt,b.pt).map(f=>buildOption(f,a.pt,b.pt));P.sel=0;
 renderOptions(a.pt,b.pt,a.label,b.label);draw(a.pt,b.pt);
}

function setPick(kind,ll){
 const lab="Titik di peta ("+ll[0].toFixed(4)+", "+ll[1].toFixed(4)+")";
 P.picked[kind]={pt:ll,label:lab};q(kind==="from"?"planFrom":"planTo").value=lab;
 if(P.mk[kind])P.map.removeLayer(P.mk[kind]);
 P.mk[kind]=pin(ll,kind==="from"?"A":"B",kind==="from"?"a":"b").addTo(P.map);
}

function start(){
 const dl=q("planPlaces");dl.innerHTML=P.idx.places.map(p=>`<option value="${E(p[0])}">`).join("");
 groups.forEach(g=>P.gmap.set(g.gid,g));
 const T=new Map();
 P.idx.transfers.forEach(([a,b,...pts])=>{
  if(!P.gmap.has(a)||!P.gmap.has(b))return;
  if(!T.has(a))T.set(a,new Map());if(!T.has(b))T.set(b,new Map());
  T.get(a).set(b,pts);T.get(b).set(a,pts);
 });
 P.adj=T;
 P.map=L.map("planMap",{scrollWheelZoom:false}).setView([-6.9147,107.6098],11);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap contributors"}).addTo(P.map);
 P.layer=L.layerGroup().addTo(P.map);
 P.map.on("click",e=>{if(!P.pickMode)return;setPick(P.pickMode,[e.latlng.lat,e.latlng.lng]);P.pickMode=null;q("planMap").classList.remove("picking");document.querySelectorAll(".plan-pick").forEach(b=>b.classList.remove("on"));});
 document.querySelectorAll(".plan-pick").forEach(b=>b.addEventListener("click",()=>{
  P.pickMode=P.pickMode===b.dataset.k?null:b.dataset.k;
  document.querySelectorAll(".plan-pick").forEach(x=>x.classList.toggle("on",x===b&&!!P.pickMode));
  q("planMap").classList.toggle("picking",!!P.pickMode);
 }));
 q("planGo").addEventListener("click",go);
 q("planSwap").addEventListener("click",()=>{const f=q("planFrom"),t=q("planTo"),v=f.value;f.value=t.value;t.value=v;const pf=P.picked.from;P.picked.from=P.picked.to;P.picked.to=pf;});
 [q("planFrom"),q("planTo")].forEach(el=>el.addEventListener("keydown",e=>{if(e.key==="Enter")go();}));
 q("planStatus").textContent="Siap. "+P.idx.places.length+" nama tempat dikenali dari data.";
}

function boot(){
 if(!q("planner"))return;
 fetch("data/planner-index.json").then(r=>r.json()).then(j=>{
  P.idx=j;
  const t=setInterval(()=>{if(typeof groups!=="undefined"&&groups.length&&typeof geoData!=="undefined"&&geoData){clearInterval(t);start();}},150);
 }).catch(e=>{q("planStatus").textContent="Gagal memuat data pencarian. Jalankan lewat Live Server.";console.error(e);});
}
boot();
})();
