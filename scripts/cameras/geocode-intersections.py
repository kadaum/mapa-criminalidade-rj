import json,re,unicodedata,math,collections,sys
# Arguments: normalized public catalog, cached official CADLOG GeoJSON, output JSON.
CAT,GEO,OUT=sys.argv[1:4]
SOURCE='https://pgeo3.rio.rj.gov.br/arcgis/rest/services/CadLog/Trechos_Logradouros/MapServer/0'
def norm(s):
 s=''.join(c for c in unicodedata.normalize('NFD',s.upper()) if unicodedata.category(c)!='Mn')
 s=re.sub(r'[^A-Z0-9 ]',' ',s);s=re.sub(r'\s+',' ',s).strip()
 words=s.split(); expand={'AV':'AVENIDA','R':'RUA','ESTR':'ESTRADA','EST':'ESTRADA','PCA':'PRACA','PC':'PRACA','DR':'DOUTOR','PROF':'PROFESSOR','GEN':'GENERAL','GAL':'GENERAL','PRES':'PRESIDENTE','PTE':'PONTE','ALM':'ALMIRANTE'}
 words=[expand.get(w,w) for w in words]
 if words and words[0] in ['AVENIDA','RUA','ESTRADA','PRACA','LARGO','TRAVESSA']:words=words[1:]
 return ' '.join(w for w in words if w not in ['DE','DA','DO','DAS','DOS'])
def clean(s):
 s=re.sub(r'\s*-\s*FIXA\s*$','',s,flags=re.I)
 return s.strip()
def dist(a,b):return math.hypot((a[0]-b[0])*102500,(a[1]-b[1])*111320)
g=json.load(open(GEO));index=collections.defaultdict(list)
for f in g['features']:
 p=f['properties'];b=norm(p.get('bairro') or '')
 for name in set([norm(p.get('completo') or ''),norm(p.get('nome_mapa') or '')]):
  if name:index[(b,name)].append(f)
cat=json.load(open(CAT));counts=collections.Counter()
for cam in cat['cameras']:
 cam['caption']=cam['name'];cam['bairro']=cam['neighborhood'];cam['locationPrecision']='unresolved'
 cam['locationEvidence']={'sourceUrl':cam['catalogUrl'],'reason':'Catalog provides text location without coordinates'}
 parts=re.split(r'\s+X\s+',clean(cam['name']),flags=re.I)
 if len(parts)!=2:counts['not_intersection']+=1;continue
 b=norm(cam['neighborhood']); names=[norm(clean(x)) for x in parts]
 a=index.get((b,names[0]),[]);c=index.get((b,names[1]),[])
 if not a or not c:counts['street_name_unmatched']+=1;continue
 def verts(features):
  out=[]
  for f in features:
   geom=f['geometry']; lines=[geom['coordinates']] if geom['type']=='LineString' else geom['coordinates']
   for line in lines:
    for v in line:out.append((v,f['properties']))
  return out
 av=verts(a);cv=verts(c);candidates=[]
 # Only actual near-coincident vertices, never street centroid or broad neighborhood proxy.
 grid=collections.defaultdict(list)
 for v,p in cv:grid[(math.floor(v[0]*102500/20),math.floor(v[1]*111320/20))].append((v,p))
 for v,p in av:
  gx,gy=math.floor(v[0]*102500/20),math.floor(v[1]*111320/20)
  for dx in [-1,0,1]:
   for dy in [-1,0,1]:
    for w,q in grid.get((gx+dx,gy+dy),[]):
     d=dist(v,w)
     if d<=15:candidates.append((d,[(v[0]+w[0])/2,(v[1]+w[1])/2],p,q))
 if not candidates:counts['no_shared_vertex']+=1;continue
 candidates.sort(key=lambda x:x[0]);best=candidates[0]
 if any(dist(best[1],v[1])>80 for v in candidates):counts['ambiguous_multiple_intersections']+=1;continue
 cam['coordinates']=[round(n,6) for n in best[1]];cam['locationPrecision']='intersection';cam['locationStatus']='geocoded-intersection';cam['locationEvidence']={'sourceUrl':SOURCE,'catalogUrl':cam['catalogUrl'],'matchedNames':[best[2]['completo'],best[3]['completo']],'matchedNeighborhood':best[2]['bairro'],'objectIds':[best[2]['objectid'],best[3]['objectid']],'distanceMeters':round(best[0],2),'method':'Two catalog street names matched to official CADLOG street names in the same neighborhood; unique shared vertex within 15 m; coordinate identifies intersection, not exact camera installation.','license':'CC BY 4.0 - Instituto Pereira Passos / Prefeitura da Cidade do Rio de Janeiro','licenseSource':'https://www.arcgis.com/home/item.html?id=899168c8feab4230a9f795ed07cdde7b'};counts['resolved_intersection']+=1
cat['geocodingSummary']=dict(counts);json.dump(cat,open(OUT,'w'),ensure_ascii=False,indent=2)
print(dict(counts));print([(c['sourceCameraId'],c['name'],c['coordinates']) for c in cat['cameras'] if c['coordinates']][:15])
