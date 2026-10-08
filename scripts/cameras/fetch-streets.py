import urllib.request,urllib.parse,json,time,sys
b='https://pgeo3.rio.rj.gov.br/arcgis/rest/services/CadLog/Trechos_Logradouros/MapServer/0/query?'
features=[]
count=json.load(urllib.request.urlopen(b+'where=1%3D1&returnCountOnly=true&f=json',timeout=45))['count']
for offset in range(0,count,2000):
 p=dict(where='1=1',returnGeometry='true',outFields='completo,nome_mapa,bairro,objectid',outSR=4326,geometryPrecision=6,f='geojson',resultRecordCount=2000,resultOffset=offset,orderByFields='objectid')
 for attempt in range(3):
  try:
   x=json.load(urllib.request.urlopen(b+urllib.parse.urlencode(p),timeout=45)); assert 'features' in x;break
  except Exception:
   if attempt==2:raise
   time.sleep(2)
 features+=x['features']
 if offset%10000==0:print(len(features),flush=True)
json.dump({'type':'FeatureCollection','features':features},open(sys.argv[1],'w'),ensure_ascii=False)
print('DONE',len(features),flush=True)
