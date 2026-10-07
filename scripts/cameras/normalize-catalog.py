"""Normalize the public CamerasRJ UI JSON (bairro -> id/caption), not feed configuration.
Usage: python3 scripts/cameras/normalize-catalog.py RAW_JSON SOURCE_URL OUTPUT_JSON
"""
import json,sys,hashlib,datetime,urllib.parse
raw,source,out=sys.argv[1:4]
content=open(raw,'rb').read();data=json.loads(content);cameras=[];ids=set()
for bairro,entries in data.items():
    for entry in entries:
        identifier=str(entry['id'])
        if not identifier.isdigit() or identifier in ids:raise ValueError('Invalid or duplicated camera ID')
        ids.add(identifier)
        cameras.append({'id':'camerasrj-'+identifier,'sourceCameraId':identifier,'name':entry['caption'],'neighborhood':bairro,'aggregator':'CamerasRJ','operator':None,'sourceUrl':'https://www.camerasrj.com.br/?'+urllib.parse.urlencode({'bairro':bairro,'camera':identifier}),'playerUrl':'https://player.camerasrj.com.br/camera/'+identifier+'/','catalogUrl':source,'coordinates':None,'locationStatus':'address-only','playbackStatus':'not-checked'})
json.dump({'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'catalogUrl':source,'rawSha256':hashlib.sha256(content).hexdigest(),'neighborhoodCount':len(data),'cameraCount':len(cameras),'cameras':cameras},open(out,'w'),ensure_ascii=False,indent=2)
