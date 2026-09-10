import {mkdir,copyFile,cp,rm,readFile} from 'node:fs/promises';
import {AVATARS} from './avatars.js';
const files=['index.html','matematikk.html','style.css','script.js','math.js','learn.js','hints.js','hint-worker.js','favicon.svg','avatars.js','expression.js','report.js','status.js','rundestatus.html'];
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const file of files)await copyFile(file,`dist/${file}`);
await cp('assets','dist/assets',{recursive:true});
for(const file of ['index.html','matematikk.html','rundestatus.html']){
 const text=await readFile(file,'utf8');
 for(const [,resource] of text.matchAll(/(?:src|href)="([^"#]+)"/g)){
  if(/^(https?:|mailto:)/.test(resource))continue;
  await readFile(`dist/${resource.split('#')[0]}`);
 }
}
for(const avatar of AVATARS)await readFile(`dist/assets/avatars/${avatar.id}.jpg`);
console.log('Built static site in dist/. All linked local assets and pages exist.');
