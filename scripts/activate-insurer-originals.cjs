const fs=require('fs'),path=require('path');
const manifest=require('../assets/insurer-logo-sources.json');
const report=JSON.parse(fs.readFileSync('assets/insurers-original/download-report.json','utf8'));
if(manifest.length!==44||report.ok!==44||report.failed.length)throw Error('44 valid originals required');
const map={};
for(let i=0;i<manifest.length;i++){
 const name=manifest[i].name;
 const ext=path.extname(new URL(manifest[i].url).pathname).toLowerCase()||'.png';
 const filename=String(i+1).padStart(2,'0')+ext;
 const p=path.join('assets','insurers-original',filename);
 if(!fs.existsSync(p)||fs.statSync(p).size<300)throw Error('missing: '+name);
 map[name]='insurers-original/'+filename;
}
const file='index.html',html=fs.readFileSync(file,'utf8');
const marker="const insurerTabs=['바로가기'";
if(!html.includes(marker)||html.includes('/* originals-44 activated */'))throw Error('unexpected site source');
const updated=html.replace(marker,'/* originals-44 activated */\nObject.assign(insurerLogoMap,'+JSON.stringify(map)+');\n'+marker);
fs.writeFileSync(file,updated,'utf8');
console.log('Activated',Object.keys(map).length,'original logo references');
