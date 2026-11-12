// Lentohaukka: yhteinen hakulogiikka ja kohdedata. Käytössä sekä sivulla (public/index.html)
// että palvelimella (netlify/functions/alerts-check.mjs), jotta hälytykset osuvat täsmälleen samoihin lentoihin kuin haku.
const ORIGINS={HEL:["Helsinki",60.317,24.963],TMP:["Tampere",61.414,23.604],TKU:["Turku",60.514,22.262],TLL:["Tallinna",59.413,24.833],OUL:["Oulu",64.930,25.355],ARN:["Tukholma",59.652,17.919]};
const ORIGIN_FACTOR={HEL:1,TLL:0.88,ARN:0.92,TMP:1.15,TKU:1.12,OUL:1.2};
const DEST={ARN:["Tukholma","Ruotsi",59.652,17.919],CPH:["Kööpenhamina","Tanska",55.618,12.656],OSL:["Oslo","Norja",60.194,11.100],RIX:["Riika","Latvia",56.924,23.971],VNO:["Vilna","Liettua",54.634,25.286],GDN:["Gdańsk","Puola",54.378,18.466],WAW:["Varsova","Puola",52.166,20.967],KRK:["Krakova","Puola",50.078,19.785],BER:["Berliini","Saksa",52.366,13.503],PRG:["Praha","Tšekki",50.101,14.260],VIE:["Wien","Itävalta",48.110,16.570],BUD:["Budapest","Unkari",47.437,19.256],AMS:["Amsterdam","Alankomaat",52.310,4.768],LGW:["Lontoo","Iso-Britannia",51.153,-0.182],DUB:["Dublin","Irlanti",53.421,-6.270],EDI:["Edinburgh","Iso-Britannia",55.950,-3.373],CDG:["Pariisi","Ranska",49.010,2.548],BRU:["Bryssel","Belgia",50.901,4.484],MUC:["München","Saksa",48.354,11.786],ZRH:["Zürich","Sveitsi",47.458,8.548],MXP:["Milano","Italia",45.630,8.723],FCO:["Rooma","Italia",41.800,12.239],NAP:["Napoli","Italia",40.886,14.291],VCE:["Venetsia","Italia",45.505,12.352],BCN:["Barcelona","Espanja",41.297,2.078],MAD:["Madrid","Espanja",40.472,-3.561],AGP:["Málaga","Espanja",36.675,-4.499],ALC:["Alicante","Espanja",38.282,-0.558],PMI:["Palma","Espanja",39.552,2.739],LIS:["Lissabon","Portugali",38.774,-9.134],FAO:["Faro","Portugali",37.014,-7.966],ATH:["Ateena","Kreikka",37.936,23.947],HER:["Heraklion","Kreikka",35.340,25.180],RHO:["Rodos","Kreikka",36.405,28.086],SPU:["Split","Kroatia",43.539,16.298],DBV:["Dubrovnik","Kroatia",42.561,18.268],IST:["Istanbul","Turkki",41.275,28.752],AYT:["Antalya","Turkki",36.898,30.800],LCA:["Larnaka","Kypros",34.875,33.625],TFS:["Teneriffa","Espanja",28.044,-16.572],LPA:["Gran Canaria","Espanja",27.932,-15.387],RAK:["Marrakech","Marokko",31.607,-8.036],KEF:["Reykjavík","Islanti",63.985,-22.605],RVN:["Rovaniemi","Suomi",66.565,25.830],KTT:["Kittilä","Suomi",67.701,24.847],DXB:["Dubai","Arabiemiirikunnat",25.253,55.365],TLV:["Tel Aviv","Israel",32.011,34.887],JFK:["New York","Yhdysvallat",40.640,-73.779],BKK:["Bangkok","Thaimaa",13.690,100.750],HKT:["Phuket","Thaimaa",8.113,98.317],NRT:["Tokio","Japani",35.772,140.393],SIN:["Singapore","Singapore",1.364,103.991],HRG:["Hurghada","Egypti",27.178,33.799],HAN:["Hanoi","Vietnam",21.221,105.807],GOI:["Goa","Intia",15.381,73.831],DPS:["Bali","Indonesia",-8.748,115.167],SKP:["Skopje","Pohjois-Makedonia",41.962,21.621],TIA:["Tirana","Albania",41.415,19.721],PRN:["Pristina","Kosovo",42.573,21.036],YYZ:["Toronto","Kanada",43.677,-79.630],CUN:["Cancún","Meksiko",21.036,-86.877],LAX:["Los Angeles","Yhdysvallat",33.942,-118.408]};
/* Hintataso maailmanlaajuisella asteikolla (maailman keskiarvo = 100).
   Eurostat 2025 (EU27=100) muunnettu kertoimella 1,212 (Suomi 121 -> 146,7); muut Maailmanpankin ICP 2021. */
const PLI={"Ruotsi":147,"Tanska":170,"Norja":156,"Latvia":101,"Liettua":101,"Puola":88,"Saksa":131,"Tšekki":108,"Itävalta":137,"Unkari":95,"Alankomaat":141,"Iso-Britannia":140.5,"Irlanti":165,"Ranska":133,"Belgia":141,"Sveitsi":207,"Italia":118,"Espanja":112,"Portugali":105,"Kreikka":105,"Kroatia":95,"Turkki":73,"Kypros":108,"Marokko":69.6,"Islanti":211,"Suomi":147,"Arabiemiirikunnat":101.9,"Israel":179.1,"Yhdysvallat":158.5,"Thaimaa":55.2,"Japani":142.5,"Singapore":95.6,"Egypti":39,"Vietnam":48.7,"Intia":44.4,"Indonesia":53.3,"Pohjois-Makedonia":67,"Albania":88,"Kosovo":67,"Kanada":149.1,"Meksiko":77.7}; /* Kosovo: ei virallista lukua, arvioitu Pohjois-Makedonian tasolle */
const plLevel=v=>v<=38?1:v<75?2:v<115?3:v<145?4:5;
/* Ilmasto joulu–toukokuu: [keskim. päivän ylin °C, yön alin °C, sademäärä mm/kk], pitkän aikavälin keskiarvot */
const CLIM={ARN:[[2,-3,50],[0,-5,40],[1,-5,30],[5,-3,30],[11,1,30],[17,6,40]],CPH:[[5,1,55],[3,-1,50],[4,-1,35],[7,0,40],[12,3,35],[17,7,45]],OSL:[[0,-6,55],[-2,-8,50],[-1,-8,35],[4,-4,40],[10,1,45],[16,6,60]],RIX:[[1,-3,50],[-1,-6,40],[0,-6,35],[5,-3,30],[12,2,35],[18,7,40]],VNO:[[0,-4,50],[-2,-7,45],[-1,-7,40],[4,-3,40],[13,2,40],[19,7,55]],GDN:[[3,-2,40],[1,-4,35],[2,-4,30],[6,-1,35],[12,3,30],[17,7,50]],WAW:[[2,-3,40],[0,-5,30],[2,-4,30],[7,-1,35],[14,4,35],[20,9,55]],KRK:[[3,-3,40],[1,-5,35],[3,-4,30],[9,0,40],[15,4,50],[20,9,80]],BER:[[4,0,45],[3,-2,40],[5,-2,35],[9,1,40],[15,4,35],[20,9,55]],PRG:[[3,-2,30],[1,-4,25],[4,-3,25],[9,0,30],[14,3,35],[19,8,65]],VIE:[[4,-1,45],[3,-2,40],[5,-1,40],[10,2,50],[16,6,45],[21,11,70]],BUD:[[4,-1,45],[2,-3,35],[6,-2,35],[11,2,30],[17,6,45],[22,11,65]],AMS:[[7,2,80],[6,1,65],[7,1,55],[10,2,55],[14,5,40],[18,8,55]],LGW:[[9,3,60],[8,2,60],[9,2,45],[12,3,40],[15,5,45],[18,8,50]],DUB:[[9,3,75],[8,2,65],[9,2,50],[11,3,50],[13,4,50],[16,7,55]],EDI:[[7,1,65],[7,1,65],[7,1,45],[9,2,50],[12,4,40],[15,6,50]],CDG:[[8,3,55],[7,3,50],[9,3,45],[13,5,45],[16,8,50],[20,11,65]],BRU:[[7,2,80],[6,1,70],[7,1,60],[11,3,60],[15,5,50],[19,9,65]],MUC:[[4,-3,50],[3,-4,50],[5,-4,45],[10,0,60],[15,3,70],[19,8,110]],ZRH:[[4,-1,75],[3,-2,65],[5,-2,60],[10,1,70],[15,5,80],[19,9,115]],MXP:[[7,-1,70],[6,-2,60],[9,-1,50],[14,3,70],[18,6,95],[23,11,125]],FCO:[[14,5,100],[13,4,70],[14,4,70],[16,6,60],[19,8,65],[24,12,45]],NAP:[[14,6,130],[13,5,100],[14,5,90],[16,7,80],[19,9,70],[24,13,45]],VCE:[[8,1,65],[7,0,50],[9,1,50],[13,4,60],[17,8,75],[22,13,75]],BCN:[[15,7,50],[14,6,40],[15,6,35],[17,8,40],[19,10,45],[22,14,45]],MAD:[[11,2,55],[10,2,35],[12,2,35],[16,5,30],[18,7,45],[23,11,45]],AGP:[[18,9,90],[17,8,65],[17,8,60],[19,10,40],[21,11,35],[24,14,15]],ALC:[[18,7,30],[17,6,20],[18,6,25],[20,8,25],[22,10,30],[25,14,30]],PMI:[[16,7,50],[15,6,40],[15,6,40],[17,8,35],[19,10,40],[23,13,30]],LIS:[[15,9,110],[15,8,100],[16,9,70],[19,10,60],[20,12,60],[23,14,40]],FAO:[[17,9,90],[16,8,60],[17,9,50],[19,10,40],[21,12,40],[24,14,15]],ATH:[[15,8,70],[14,7,55],[14,7,45],[17,8,45],[21,11,25],[26,16,15]],HER:[[17,11,90],[16,9,90],[16,9,70],[18,10,55],[21,12,25],[25,15,10]],RHO:[[18,11,170],[16,9,140],[16,9,100],[18,10,70],[21,12,25],[25,16,10]],SPU:[[12,5,120],[11,4,80],[12,5,70],[15,7,75],[18,10,65],[23,15,60]],DBV:[[14,7,180],[13,6,110],[13,6,110],[15,8,110],[18,11,90],[22,15,60]],IST:[[11,5,120],[9,3,100],[10,3,75],[12,4,70],[17,8,45],[22,13,35]],AYT:[[17,7,250],[15,6,220],[16,6,140],[19,8,90],[22,11,45],[27,15,25]],LCA:[[19,9,80],[17,7,70],[17,7,55],[20,9,40],[23,12,15],[27,16,5]],TFS:[[23,16,25],[22,15,15],[22,15,15],[23,16,15],[23,16,5],[24,17,2]],LPA:[[23,16,20],[21,15,20],[22,15,15],[22,16,10],[23,16,5],[24,18,2]],RAK:[[19,6,35],[19,6,30],[20,8,35],[23,11,35],[25,12,30],[29,16,15]],KEF:[[3,-2,90],[3,-2,85],[3,-2,80],[4,-1,85],[7,1,60],[10,4,45]],RVN:[[-6,-13,45],[-8,-16,40],[-7,-15,30],[-2,-11,30],[4,-5,30],[11,2,40]],KTT:[[-9,-18,35],[-10,-20,30],[-9,-19,25],[-3,-14,25],[2,-8,25],[9,0,35]],DXB:[[26,16,15],[24,14,20],[25,15,25],[29,18,20],[33,21,10],[38,25,1]],TLV:[[21,11,130],[18,9,130],[19,9,90],[21,11,60],[24,14,15],[27,17,3]],JFK:[[6,-1,100],[4,-3,90],[5,-2,80],[10,2,105],[17,7,100],[22,12,95]],BKK:[[32,22,10],[33,22,15],[34,24,25],[35,26,50],[36,27,80],[35,27,220]],HKT:[[32,24,60],[32,24,30],[33,24,20],[33,25,50],[33,25,130],[32,25,290]],NRT:[[12,4,60],[10,2,60],[11,2,60],[14,5,115],[19,10,130],[23,15,140]],SIN:[[30,24,250],[31,24,230],[32,24,150],[32,25,180],[32,25,170],[32,25,170]],HRG:[[24,14,1],[22,12,0],[23,12,0],[26,15,0],[30,19,0],[33,23,0]],HAN:[[22,15,20],[20,14,20],[21,16,30],[23,18,50],[28,22,100],[32,25,190]],GOI:[[33,21,10],[32,20,1],[32,21,0],[33,23,1],[33,26,10],[33,27,100]],DPS:[[31,24,350],[30,24,350],[30,24,300],[31,24,200],[31,24,90],[31,24,80]],SKP:[[5,-3,50],[4,-4,35],[8,-2,35],[13,2,40],[19,6,45],[24,10,60]],TIA:[[13,3,150],[12,2,130],[13,3,130],[16,5,110],[20,8,100],[25,13,90]],PRN:[[4,-4,60],[3,-5,45],[6,-4,40],[11,0,45],[17,4,55],[22,9,70]],YYZ:[[1,-5,60],[-1,-8,60],[0,-7,55],[5,-3,55],[12,3,70],[19,9,75]],CUN:[[28,20,90],[28,19,80],[28,19,50],[30,21,40],[31,22,40],[32,24,90]],LAX:[[20,9,60],[20,9,80],[20,10,85],[21,11,50],[22,12,20],[23,14,8]]};

/* Lentoajat (esimerkkimalli): suora ≈ matka/800 km/h + 0,5 h; välilaskulla reitti ~12 % pidempi + 2 h vaihto */
const NODIRECT_HEL=new Set(["SKP","PRN","TIA","RAK","HAN","GOI","DPS","EDI","NAP","SPU","DBV","KTT","FAO"]);
function hasDirect(o,d,dist){
  if(o==="HEL")return !NODIRECT_HEL.has(d);
  if(o==="ARN"||o==="TLL")return dist<4200&&h(o+d+"dir")>(o==="ARN"?0.2:0.55);
  return dist<3200&&h(o+d+"dir")>0.85;
}
function times(o,d,dist){
  const direct=hasDirect(o,d,dist)?dist/800+0.5:null;
  const stop=(dist*1.12)/800+1+2+(h(o+d+"st")*1.5);
  return {direct,stop};
}
function timeOk(t,q){
  const md=q.maxDirect||0,ms=q.maxStop||0;if(!md&&!ms)return true;
  const okD=md&&t.direct!=null&&t.direct<=md;
  const okS=ms&&Math.min(t.stop,t.direct??Infinity)<=ms;
  return !!(okD||okS);
}
const rainCat=mm=>mm<40?0:mm<=80?1:2, dayCat=t=>t<12?0:t<=22?1:2, nightCat=t=>t<3?0:t<=10?1:2;
const MONTHS=[["2026-12","Joulukuu 2026"],["2027-01","Tammikuu 2027"],["2027-02","Helmikuu 2027"],["2027-03","Maaliskuu 2027"],["2027-04","Huhtikuu 2027"],["2027-05","Toukokuu 2027"]];

function km(a1,o1,a2,o2){const R=6371,r=Math.PI/180,dA=(a2-a1)*r,dO=(o2-o1)*r;const x=Math.sin(dA/2)**2+Math.cos(a1*r)*Math.cos(a2*r)*Math.sin(dO/2)**2;return Math.round(2*R*Math.asin(Math.sqrt(x)))}
function h(s){let x=2166136261;for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)}return ((x>>>0)%10000)/10000}
function price(o,d,m){
  const [ ,la,lo]=ORIGINS[o],[ , ,dl,dn]=DEST[d];const dist=km(la,lo,dl,dn);
  let base=dist>3500?160+dist*0.052:28+dist*0.058;
  let mult=(0.82+0.45*h(o+d+m))*ORIGIN_FACTOR[o];
  const deal=h(d+m+"deal"+o)<0.11; if(deal)mult*=0.58;
  return {p:Math.max(19,Math.round(base*mult)),deal,dist};
}
const CITY2KEY={YTO:"YYZ",LON:"LGW",PAR:"CDG",ROM:"FCO",MIL:"MXP",NYC:"JFK",TYO:"NRT",REK:"KEF",TCI:"TFS",GOX:"GOI"};
function liveKey(d,a){if(DEST[a])return a;if(CITY2KEY[d])return CITY2KEY[d];return DEST[d]?d:null}
/* Kannabis: laillinen tai pienten määrien hallussapidosta ei rangaista (tilanne 11/2026) */
const CANNA_C=new Set(["Saksa","Tšekki","Alankomaat","Sveitsi","Espanja","Portugali","Kanada","Meksiko"]); /* Espanja ja Portugali: ei rikosoikeudellista rangaistusta */
const CANNA_D=new Set(["JFK","LAX"]); /* USA: osavaltioissa New York ja Kalifornia laillista */
const cannaOk=d=>CANNA_C.has(DEST[d][1])||CANNA_D.has(d);
const clockMin=t=>t&&t.length>=16?(+t.slice(11,13))*60+(+t.slice(14,16)):null;
function clockOk(dep,ret,q){
  if(q.amOut){const v=clockMin(dep);if(v==null||v<6*60||v>11*60)return false}
  if(q.pmRet&&q.trip!=="ow"){const v=clockMin(ret);if(v==null||v<15*60||v>23*60)return false}
  return true;
}
const ALL3=[0,1,2],ALL5=[1,2,3,4,5];
const PRICE_MAX=800,KM_MAX=12000;
function norm(q){const o={pl:[],rain:[],day:[],night:[],trip:"rt",amOut:false,pmRet:false,canna:false,maxDirect:0,maxStop:0,minKm:0,...q};
  if(!o.pl.length)o.pl=ALL5;if(!o.rain.length)o.rain=ALL3;if(!o.day.length)o.day=ALL3;if(!o.night.length)o.night=ALL3;return o}
function climOk(d,mi,q){const c=CLIM[d][mi];return q.rain.includes(rainCat(c[2]))&&q.day.includes(dayCat(c[0]))&&q.night.includes(nightCat(c[1]))}
/* ctx = {mode:"live"|"example", offers:(o,d,m,trip)=>[tarjoukset halvimmasta]} */
function best(o,d,q,ctx){
  let b=null;
  const dist=km(ORIGINS[o][1],ORIGINS[o][2],DEST[d][2],DEST[d][3]);
  MONTHS.forEach(([m],mi)=>{
    if(q.month!=="all"&&q.month!==m)return;
    if(!climOk(d,mi,q))return;
    if(ctx.mode==="live"){
      for(const x of (ctx.offers(o,d,m,q.trip)||[])){
        const hrs=x.dur?x.dur/60:null;
        const t={direct:x.tr===0?hrs:null,stop:x.tr<=1&&hrs!=null?hrs:Infinity,dur:hrs};
        if(!timeOk(t,q)||!clockOk(x.dep,x.ret,q))continue;
        if(!b||x.p<b.p)b={p:Math.round(x.p),deal:false,dist,live:x,m,mi,t};
        break;
      }
    }else{
      const t=times(o,d,dist),r=price(o,d,m);if(q.trip==="ow")r.p=Math.max(15,Math.round(r.p*0.55));
      const dh=`T${String(5+Math.floor(h(o+d+m+"dh")*18)).padStart(2,"0")}:${h(o+d+m+"dm")<.5?"10":"40"}`,rh=`T${String(5+Math.floor(h(o+d+m+"rh")*18)).padStart(2,"0")}:${h(o+d+m+"rm")<.5?"05":"35"}`;
      if(!timeOk(t,q)||!clockOk("0000-00-00"+dh,"0000-00-00"+rh,q))return;
      if(!b||r.p<b.p)b={...r,m,mi,t};
    }
  });
  return b;
}
function search(q,ctx){
  q=norm(q);const os=q.origins, out=[];
  for(const d of Object.keys(DEST)){
    if(os.includes(d))continue;
    if(!q.pl.includes(plLevel(PLI[DEST[d][1]])))continue;
    if(q.canna&&!cannaOk(d))continue;
    const [ ,ha,ho]=ORIGINS[q.origin];const dKm=km(ha,ho,DEST[d][2],DEST[d][3]);
    if(dKm<(q.minKm||0)||(q.maxKm<KM_MAX&&dKm>q.maxKm))continue;
    let b=null;
    for(const o of os){if(o===d)continue;const r=best(o,d,q,ctx);if(r&&(!b||r.p<b.p))b={...r,o}}
    if(b&&(q.maxPrice>=PRICE_MAX||b.p<=q.maxPrice))out.push({d,...b,homeKm:dKm});
  }
  return out.sort((a,b)=>a.p-b.p);
}
/* Lähtökentät, kun "lähikentät" on valittu */
function originsFor(s){
  if(!s.near)return [s.origin];
  const [ ,a,o]=ORIGINS[s.origin];
  return Object.keys(ORIGINS).filter(c=>c===s.origin||km(a,o,ORIGINS[c][1],ORIGINS[c][2])<=s.radius);
}
/* /api/prices-vastauksen lista -> {kohdeavain: [tarjoukset halvimmasta, max 25]} */
function indexOffers(list){
  const map={};
  for(const x of list){const key=liveKey(x.d,x.a);if(!key)continue;(map[key]=map[key]||[]).push(x)}
  for(const k in map)map[k]=map[k].sort((a,b)=>a.p-b.p).slice(0,25);
  return map;
}

export {ORIGINS,ORIGIN_FACTOR,DEST,PLI,plLevel,CLIM,NODIRECT_HEL,hasDirect,times,timeOk,rainCat,dayCat,nightCat,MONTHS,km,h,price,CITY2KEY,liveKey,CANNA_C,CANNA_D,cannaOk,clockMin,clockOk,ALL3,ALL5,PRICE_MAX,KM_MAX,norm,climOk,best,search,originsFor,indexOffers};
