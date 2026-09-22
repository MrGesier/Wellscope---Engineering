'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..','app');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const engine=fs.readFileSync(path.join(root,'engine.js'),'utf8');
const help=fs.readFileSync(path.join(root,'tooltips.js'),'utf8');
let loaded=false;
const env={window:{},document:{readyState:'loading',addEventListener:(event,callback)=>{if(event==='DOMContentLoaded')loaded=typeof callback==='function';}}};
vm.runInNewContext(help,env,{filename:'tooltips.js'});
const h=env.window.WellHelp;
assert.ok(h && loaded,'The English tooltip module must register a DOM-ready initializer');
assert.ok(Object.keys(h.HELP).length>=75,'Expected comprehensive engineering descriptions');
assert.equal(Object.keys(h.FAMILIES).length,11,'Expected a detailed description for each BHA family');
assert.equal(Object.keys(h.TERMS).length,26,'Expected contextual help for all module headings');
assert.match(html,/<html lang="en">/);
assert.ok(html.indexOf('src="tooltips.js"') < html.indexOf('src="app.js"'),'Help glossary must load before dynamic tool-card creation');
for(const id of ['mud','friction','steel','bitforce','hookref','hookcap','sref','srefE','srefV','soff','soffE','soffV','rref','roff','offnorth','offeast','acfocus','refcsv','offcsv','sidefile','offBfile','scene','acscene','accross','acplan','tdscene','tdplot','bhaplot']){
 assert.match(html,new RegExp(`id="${id}"`),`Expected interface element ${id}`);
 assert.ok(typeof h.HELP[id]==='string'&&h.HELP[id].length>90,`Expected detailed contextual help for ${id}`);
}
assert.match(app,/toLocaleString\('en-US'/);
assert.match(engine,/Survey MD values must be strictly increasing/);
for(const [name,text] of [['index.html',html],['app.js',app],['engine.js',engine]]){
 assert.doesNotMatch(text,/\b(?:puits voisin|référence|géométrique|non fourni|non calculé|frottement|invalide|démo|calculer trajectoire|appliquer la composition)\b/i,`${name} contains an untranslated interface label`);
}
console.log(`PASS: English UI wiring and ${Object.keys(h.HELP).length} detailed help definitions, ${Object.keys(h.TERMS).length} heading tips, ${Object.keys(h.FAMILIES).length} equipment family tips`);
