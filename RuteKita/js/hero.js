// Slideshow kendaraan di hero. Tiap kendaraan: foto lokal (img/<kode>.jpg) -> foto Wikimedia Commons. Kendaraan tanpa foto otomatis dilewati (tidak ada ilustrasi).
// Foto yang gagal dimuat otomatis dilewati.
// Mau pakai foto sendiri? Taruh di folder img/ dengan nama: mjt, tmb, damri, feeder, angkot, elf, shuttle, commuter (.jpg).
const WC=f=>"https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent(f)+"?width=1400";
const WCPAGE=f=>"https://commons.wikimedia.org/wiki/File:"+encodeURIComponent(f.replace(/ /g,"_"));
const VEH=[
 {k:"mjt",title:"Metro Jabar Trans (BRT)",desc:"Bus biru BRT 6 koridor lintas Bandung Raya. Tarif flat Rp4.900, bayar non-tunai.",wc:"Two Trans Metro Pasundan Buses from Two Different Operators.jpg"},
 {k:"tmb",title:"Trans Metro Bandung (BRT)",desc:"Bus kota dari Pemkot Bandung. 5 koridor di dalam Kota Bandung.",wc:"Trans Metro Bandung Corridor 5 Buses at Gedebage Bus Garage.jpg"},
 {k:"damri",title:"DAMRI",desc:"Bus kota milik BUMN, melayani jalur seperti Elang–Jatinangor dan Ledeng–Leuwipanjang."},
 {k:"feeder",title:"Feeder",desc:"Bus kecil pengumpan yang membawa penumpang ke koridor BRT atau stasiun."},
 {k:"angkot",title:"Angkot",desc:"Minibus trayek tetap yang warnanya beda tiap jurusan. Bisa naik dan turun di mana saja di sepanjang jalur.",wc:"Angkot Kalapa-Dago in 2012.jpg"},
 {k:"elf",title:"Elf",desc:"Minibus antarkota untuk jarak menengah, mis. Kalapa–Majalaya dan Ciwidey–Leuwipanjang."},
 {k:"shuttle",title:"Shuttle",desc:"Kendaraan antar-jemput kawasan atau stasiun, ada yang gratis dan ada yang berbayar."},
 {k:"commuter",title:"Commuter Line Bandung Raya",desc:"Kereta lokal Padalarang–Bandung–Cicalengka, sekitar 17 perjalanan per hari tiap arah.",wc:"Greater Bandung Regional Train in Haurpugur.jpg"}
];
(function(){
 const box=document.getElementById("heroSlides");if(!box)return;
 const dots=document.getElementById("heroDots"),title=document.getElementById("photoTitle"),credit=document.getElementById("photoCredit"),desc=document.getElementById("photoDesc");
 const calm=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
 const ok=[];let cur=-1,timer=null;
 function show(i){
  if(!ok.length)return;cur=(i+ok.length)%ok.length;
  [...box.children].forEach((im,k)=>im.classList.toggle("on",k===cur));
  [...dots.children].forEach((d,k)=>d.classList.toggle("on",k===cur));
  const s=ok[cur];title.textContent=s.title;if(desc)desc.textContent=s.desc;
  credit.innerHTML=s.page?`<a href="${s.page}" target="_blank" rel="noopener">${s.credit}</a>`:s.credit;
 }
 function play(){clearInterval(timer);if(!calm&&ok.length>1)timer=setInterval(()=>show(cur+1),6000);}
 function tryLoad(urls){return urls.reduce((p,u)=>p.then(r=>r||new Promise(res=>{const im=new Image();im.onload=()=>res({im,u});im.onerror=()=>res(null);im.src=u.src;})),Promise.resolve(null));}
 function add(v,img,credit,page){
  img.alt=v.title;box.appendChild(img);
  const d=document.createElement("button");d.type="button";d.setAttribute("aria-label","Tampilkan "+v.title);
  const idx=ok.length;ok.push({title:v.title,desc:v.desc,credit,page});d.addEventListener("click",()=>{show(idx);play();});dots.appendChild(d);
  if(idx===0)show(0);else{dots.style.display="flex";play();}
 }
 dots.style.display="none";
 VEH.reduce((p,v)=>p.then(async()=>{
  const cands=[{src:"img/"+v.k+".jpg",credit:"Foto: koleksi RuteKita"}];
  if(v.wc)cands.push({src:WC(v.wc),credit:"Foto: Wikimedia Commons",page:WCPAGE(v.wc)});
  const hit=await tryLoad(cands);
  if(hit)add(v,hit.im,hit.u.credit,hit.u.page);
 }),Promise.resolve());
})();
