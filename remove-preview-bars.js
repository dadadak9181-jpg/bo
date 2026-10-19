const fs=require('fs'),path=require('path');
const dir=path.resolve('captured-templates-v3');
const pages=JSON.parse(fs.readFileSync(path.join(dir,'templates.json'),'utf8'));
let changed=0;
for(const p of pages){
 const file=path.join(dir,p.html);if(!fs.existsSync(file))continue;
 let html=fs.readFileSync(file,'utf8');
 const before=html;
 html=html.replace(/<style\s+id=["']local-site-style["'][^>]*>[\s\S]*?<\/style>/gi,'');
 html=html.replace(/<nav\s+id=["']local-site-menu["'][^>]*>[\s\S]*?<\/nav>/gi,'');
 html=html.replace(/<div\s+id=["']local-site-note["'][^>]*>[\s\S]*?<\/div>/gi,'');
 if(html!==before){fs.writeFileSync(file,html,'utf8');changed++}
}
const home=pages.find(p=>new URL(p.url).pathname==='/')||pages.find(p=>new URL(p.url).pathname==='/index.php');
if(home)fs.copyFileSync(path.join(dir,home.html),path.join(dir,'index.html'));
console.log('Removed injected menu and notice from',changed,'pages. Homepage set:',home?.html||'missing');
