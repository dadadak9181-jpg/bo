import json,re,urllib.request,os,time
from pathlib import Path
raw=Path('assets/insurer-details.js').read_text(encoding='utf8')
data=json.loads(re.sub(r';\s*$','',raw.split('=',1)[1]))
root=Path('assets/insurers/captured');root.mkdir(parents=True,exist_ok=True)
mapping={}
failed=[]
for index,(name,detail) in enumerate(data.items()):
 url=detail.get('logo','')
 if not url.startswith('https://iga.pe.kr/'):
  failed.append(name);continue
 ext=url.split('?')[0].lower().rsplit('.',1)[-1]
 if ext not in ('jpg','jpeg','png','webp'): ext='png'
 filename=f'{index:02d}.{ext}'
 dest=root/filename
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36','Referer':'https://iga.pe.kr/index.php','Accept':'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'})
  with urllib.request.urlopen(req,timeout=20) as r: content=r.read()
  if len(content)<500 or not (content.startswith(b'\x89PNG') or content.startswith(b'\xff\xd8') or content.startswith(b'RIFF')):
   raise ValueError('not image')
  dest.write_bytes(content)
  mapping[name]='insurers/captured/'+filename
  print('OK',index+1,name,len(content))
 except Exception as e:
  failed.append(name);print('FAILED',index+1,name,str(e)[:150])
Path('assets/insurer-logo-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2),encoding='utf8')
if failed:
 print('FAILED:',failed)
 raise SystemExit('Only '+str(len(mapping))+'/44 images downloaded; workflow will upload successes')
