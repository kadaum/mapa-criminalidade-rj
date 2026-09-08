"""Build public reference catalog from reviewed research outputs, never stream endpoints.
Usage: python3 scripts/cameras/assemble-catalog.py GEOCODED_JSON WEBCAMS_JSON SEED_JSON
"""
import json,sys,pathlib
geo,web,seed=[json.load(open(p)) for p in sys.argv[1:4]]
cameras=seed.copy(); evidence={}
for c in geo['cameras']:
    mapped=c['coordinates'] is not None
    fail=c['sourceCameraId'] in ['49','1197']
    cameras.append(dict(id=c['id'],name=c['name'],neighborhood=c['neighborhood'],operator='Não informado pelo catálogo',publisher='CamerasRJ',address=c['name'],coordinates=c['coordinates'],precision=('address' if c.get('locationPrecision')=='address-range' else 'intersection') if mapped else 'unresolved',locationSource=c['locationEvidence']['sourceUrl'] if mapped else '',source=c['sourceUrl'],watchUrl=c['playerUrl'],access='public',status='failed' if fail else 'unverified',**({'checkedAt':'08/09/2026'} if fail else {}),note='O player falhou no teste. Isso pode ser incompatibilidade de navegador/codec; não confirma câmera desligada.' if fail else ('Endereço estimado ao longo da via pela faixa de numeração CADLOG; posição da câmera não confirmada. Reprodução não testada.' if c.get('locationPrecision')=='address-range' else 'Referência do catálogo CamerasRJ. Reprodução não testada; pode depender de navegador e codec compatíveis.')))
    if mapped:evidence[c['id']]=c['locationEvidence']
areas={'leme':'Leme','copacabana':'Copacabana','diabo':'Ipanema','arpoador':'Ipanema','ipanema':'Ipanema','leblon':'Leblon','sao-conrado':'São Conrado','pepino':'São Conrado','postinho':'Barra da Tijuca','barra':'Barra da Tijuca','posto6':'Barra da Tijuca','reserva':'Barra da Tijuca','recreio':'Recreio dos Bandeirantes','macumba':'Recreio dos Bandeirantes','prainha':'Recreio dos Bandeirantes'}
for c in web['cameras']:
    if c['id'].startswith('surfconnect-'):
        coord=c.get('coordinates') if c.get('mapEligible') is not False else None
        neighborhood=next((v for k,v in areas.items() if k in c['id']),'Rio de Janeiro')
        access={'gratuito':'public','cadastro_gratuito':'registration','assinatura':'subscription'}[c['access']]
        observed=c['id']=='surfconnect-leme'
        note='O operador indica o pico da praia, não a posição medida da câmera. Acesso e reprodução podem mudar.'
        if observed:note='Vídeo reproduziu no levantamento, mas o carimbo da câmera exibia 14/01/2000. Horário inconsistente; não certifica atualidade.'
        if coord is None:note='A página reutiliza a coordenada de outro pico. Marcador rejeitado até confirmação da localização.'
        cameras.append(dict(id=c['id'],name=c['name'],neighborhood=neighborhood,operator='SurfConnect',publisher='SurfConnect',address=c.get('address') or c['name'],coordinates=[coord['longitude'],coord['latitude']] if coord else None,precision='spot' if coord else 'unresolved',locationSource=c['coordinateSource'] if coord else '',source=c['sourceUrl'],access=access,status='observed' if observed else 'unverified',**({'checkedAt':'08/09/2026'} if observed else {}),note=note))
    elif c['id'] in ['worldcam-40612','worldcam-36669']:
        coord=c['coordinates'];home=c['id']=='worldcam-40612'
        cameras.append(dict(id='homes-posto-3' if home else 'mar-urbano-posto-6',**({'youtubeId':'7ecGJrsCv60'} if home else {}),name='Copacabana · Posto 3' if home else 'Copacabana · Posto 6 (Mar Urbano)',neighborhood='Copacabana',operator='Homes in Rio' if home else 'Instituto Mar Urbano',publisher='Homes in Rio' if home else 'Instituto Mar Urbano',address='Posto 3, Copacabana' if home else 'Posto 6, Copacabana',coordinates=[coord['longitude'],coord['latitude']],precision='directory',locationSource=c['coordinateSource'],source='https://www.youtube.com/watch?v=7ecGJrsCv60' if home else c['sourceUrl'],access='public',status='observed' if home else 'unverified',**({'checkedAt':'08/09/2026'} if home else {}),note='Vídeo reproduziu no levantamento. Localização aproximada do diretório; posição da instalação não confirmada.' if home else 'Localização aproximada publicada por diretório. Instalação e reprodução ainda não confirmadas.'))
cameras.append(dict(id='paineiras-corcovado',name='Paineiras Corcovado',neighborhood='Alto da Boa Vista',operator='Paineiras Corcovado',publisher='Paineiras Corcovado',address='Centro de Visitantes Paineiras-Corcovado (descrição do canal)',coordinates=None,precision='unresolved',locationSource='',source='https://www.youtube.com/watch?v=aRDuS1iqioU',youtubeId='aRDuS1iqioU',access='public',status='unverified',note='YouTube indicava transmissão ao vivo no levantamento. Posição da câmera e imagem em movimento ainda não verificadas; não foi usado o ponto da estátua como localização.'))
# Sort our own presentation independently of source catalog organization.
cameras.sort(key=lambda c:(c['status']!='observed',c['publisher']=='CamerasRJ',c['neighborhood'].casefold(),c['name'].casefold(),c['id']))
base=pathlib.Path('public/data');base.mkdir(exist_ok=True)
result={'reviewedAt':'08/09/2026','scope':'Município do Rio de Janeiro; referências encontradas nas fontes consultadas, não cobertura integral de câmeras ou de transmissões funcionando.','attribution':[{'name':'CamerasRJ','url':geo['catalogUrl'],'note':'Nomes, IDs e locais de referências públicas. Não atribuir licença MIT ou PDDL ao catálogo original.'},{'name':'CADLOG / Instituto Pereira Passos / Prefeitura do Rio','url':'https://www.arcgis.com/home/item.html?id=899168c8feab4230a9f795ed07cdde7b','license':'CC BY 4.0','transformation':'Cruzamentos derivados por nomes e vértices; endereços interpolados nas faixas oficiais de numeração, com paridade. Posição exata do equipamento desconhecida.'}], 'cameras':cameras}
(base/'public-cameras.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')))
(base/'camera-location-evidence.json').write_text(json.dumps(evidence,ensure_ascii=False,separators=(',',':')))
print({'total':len(cameras),'mapped':sum(bool(c['coordinates']) for c in cameras),'publicMapped':sum(bool(c['coordinates']) and c['access']=='public' for c in cameras),'pending':sum(c['coordinates'] is None for c in cameras)})
