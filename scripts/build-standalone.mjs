import {build} from 'vite';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';

// A single-file deliverable with app, CSS and dated market history inlined.
// A hosted copy can refresh prices from the optional same-origin /api/market service.
const result=await build({configFile:false,logLevel:'warn',build:{write:false,minify:true,target:'es2020',lib:{entry:resolve('src/game.js'),name:'LemonadeLane',formats:['iife']}}});
const chunks=(Array.isArray(result)?result:[result]).flatMap(r=>r.output).filter(o=>o.type==='chunk');
if(chunks.length!==1)throw new Error('Standalone build must contain exactly one script.');
const css=await readFile('src/scene.css','utf8');
let html=await readFile('index.html','utf8');
html=html.replace('<link rel="stylesheet" href="/src/scene.css">',()=>`<style>${css}</style>`);
html=html.replace('<script type="module" src="/src/game.js"></script>',()=>`<script>${chunks[0].code.replace(/<\/script/gi,'<\\/script')}</script>`);
if(/(?:src|href)="\/src\//.test(html))throw new Error('Unbundled source reference remains.');
await mkdir('dist',{recursive:true});
const filenames=['lemonade-lane.html','lemonade-lane-park.html','lemonade-lane-downtown.html','lemonade-lane-waterfront.html'];
await Promise.all(filenames.map(name=>writeFile(`dist/${name}`,html)));
console.log('Standalone game: dist/lemonade-lane.html (with park, downtown and waterfront review filenames)');
