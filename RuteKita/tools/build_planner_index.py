# Membangun data/planner-index.json untuk fitur "Cari Rute" (asal -> tujuan).
# Jalankan ulang bila data/route-catalog.json atau data/routes-geo.json berubah:  python3 tools/build_planner_index.py
import json, math
STEP=150        # jarak sampling titik jalur (meter)
TRANSFER=200    # dua trayek dianggap bisa oper bila jalurnya berdekatan <= segini (meter)
def hav(a,b):
    R=6371000;p=math.pi/180
    dl=(b[0]-a[0])*p;dn=(b[1]-a[1])*p
    x=math.sin(dl/2)**2+math.cos(a[0]*p)*math.cos(b[0]*p)*math.sin(dn/2)**2
    return 2*R*math.asin(math.sqrt(x))
cat=json.load(open('data/route-catalog.json'));geo=json.load(open('data/routes-geo.json'))
gid_of={r['id']:r['group_id'] for r in cat}
pts={}
for f in geo['features']:
    gid=gid_of[f['properties']['id']];out=pts.setdefault(gid,[])
    for line in f['geometry']['coordinates']:
        prev=None;acc=0
        for lng,lat in line:
            p=(lat,lng)
            if prev is None: out.append(p);acc=0
            else:
                acc+=hav(prev,p)
                if acc>=STEP: out.append(p);acc=0
            prev=p
# dedup
for g in pts: pts[g]=sorted(set((round(a,5),round(b,5)) for a,b in pts[g]))
# grid index
CELL=0.002;grid={}
for g,ps in pts.items():
    for p in ps: grid.setdefault((int(p[0]/CELL),int(p[1]/CELL)),[]).append((g,p))
pairs={}
for g,ps in pts.items():
    for p in ps:
        cx,cy=int(p[0]/CELL),int(p[1]/CELL)
        for dx in(-1,0,1):
            for dy in(-1,0,1):
                for h,q in grid.get((cx+dx,cy+dy),[]):
                    if h<=g: continue
                    d=hav(p,q)
                    if d<=TRANSFER:
                        pairs.setdefault((g,h),[]).append(((p[0]+q[0])/2,(p[1]+q[1])/2,d))
transfers=[]
for (g,h),lst in pairs.items():
    lst.sort(key=lambda t:t[2]);keep=[]
    for la,ln,d in lst:
        if all(hav((la,ln),(k[0],k[1]))>500 for k in keep): keep.append((la,ln,d))
        if len(keep)>=8: break
    transfers.append([g,h]+[[round(k[0],5),round(k[1],5)] for k in keep])
places={}
for r in cat:
    for s in r.get('stops',[]): places.setdefault(s['name'],[round(s['coordinates'][1],5),round(s['coordinates'][0],5)])
out={'groups':{g:[[a,b] for a,b in ps] for g,ps in pts.items()},'transfers':transfers,
     'places':[[n,v[0],v[1]] for n,v in sorted(places.items())],'meta':{'step_m':STEP,'transfer_m':TRANSFER}}
json.dump(out,open('data/planner-index.json','w'),separators=(',',':'),ensure_ascii=False)
print(len(pts),'trayek',len(transfers),'pasangan oper',len(places),'tempat')
