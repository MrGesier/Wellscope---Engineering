/* Original simplified engineering pictograms, NOT equipment drawings or scaled component geometry. */
(function(root){'use strict';
const library=[
 {type:'pdc',label:'PDC bit',sub:'Fixed cutters',name:'PDC bit 8½″',length:.44,od:.216,id:.025,mass:64},
 {type:'tricone',label:'Tricone bit',sub:'Roller cones',name:'Tricone bit 8½″',length:.52,od:.216,id:.025,mass:85},
 {type:'motor',label:'Mud motor · PDM',sub:'Bent housing',name:'PDM 6¾″',length:9.4,od:.172,id:.075,mass:122},
 {type:'rss',label:'Rotary steerable',sub:'Push / point-the-bit',name:'RSS 6¾″',length:7.5,od:.172,id:.075,mass:140},
 {type:'stab',label:'Stabilizer',sub:'Gauge & blades',name:'String stabilizer 8⅜″',length:1.5,od:.211,id:.07,mass:132},
 {type:'mwd',label:'MWD / LWD',sub:'Survey / telemetry',name:'NMDC / MWD',length:10,od:.172,id:.07,mass:110},
 {type:'nmdc',label:'Drill collar',sub:'Stiff tubular',name:'NMDC',length:9.5,od:.172,id:.07,mass:125},
 {type:'hwdp',label:'HWDP',sub:'Transition',name:'HWDP',length:9.5,od:.127,id:.075,mass:55},
 {type:'dp',label:'Drill pipe',sub:'Tool joints',name:'Drill pipe 5″',length:100,od:.127,id:.108,mass:30},
 {type:'jar',label:'Drilling jar',sub:'Impact tool',name:'Hydraulic jar',length:9.5,od:.172,id:.065,mass:120},
 {type:'reamer',label:'Reamer',sub:'Hole opener',name:'Near-bit reamer',length:2.2,od:.211,id:.075,mass:115}
];
function typeOf(name){let n=String(name).toLowerCase();if(n.includes('tricone')||n.includes('roller'))return 'tricone';if(n.includes('pdc')||n.includes('bit')||n.includes('trépan'))return 'pdc';if(n.includes('motor')||n.includes('pdm'))return 'motor';if(n.includes('rss'))return 'rss';if(n.includes('stab'))return 'stab';if(n.includes('mwd')||n.includes('lwd'))return 'mwd';if(n.includes('jar'))return 'jar';if(n.includes('ream'))return 'reamer';if(n.includes('hwdp'))return 'hwdp';if(n.includes('nmdc')||n.includes('collar'))return 'nmdc';return 'dp';}
function svg(type){const steel='#779cb5',line='#b5d3df',a='#52dbc8',gold='#ffc078';let shape=`<rect x="10" y="23" width="78" height="18" rx="3" fill="${steel}" stroke="${line}"/><path d="M24 24v16 M74 24v16" stroke="#33506a"/>`;
switch(type){
case 'pdc':shape=`<rect x="14" y="25" width="49" height="13" rx="2" fill="${steel}"/><path d="M63 23L87 28 92 32 87 37 63 41Z" fill="${a}" stroke="${line}"/><path d="M67 25L78 32 67 39 M76 26L87 32 76 38" stroke="#0d3647" stroke-width="2"/>`;break;
case 'tricone':shape=`<rect x="10" y="25" width="42" height="13" rx="2" fill="${steel}"/><path d="M52 23l20 7-12 8z M62 22l27 11-27 10z M50 42l20-10-4 14z" fill="${gold}" stroke="${line}"/><circle cx="74" cy="32" r="3" fill="#0f2737"/>`;break;
case 'motor':shape=`<path d="M10 28h34l7 8h37v10H50l-7-8H10z" fill="${steel}" stroke="${line}"/><path d="M20 29l13 17 10-17 11 17 10-9" fill="none" stroke="${a}" stroke-width="2.8"/><path d="M46 26l12 14" stroke="${gold}" stroke-width="2"/>`;break;
case 'rss':shape=`<rect x="10" y="25" width="78" height="14" rx="3" fill="${steel}"/><path d="M36 25l-6-11 16 11 M63 39l8 11-18-11" fill="${gold}" stroke="${gold}"/><rect x="48" y="27" width="14" height="10" rx="2" fill="${a}"/>`;break;
case 'stab':shape=`<rect x="10" y="27" width="78" height="10" rx="2" fill="${steel}"/><path d="M32 26l12-11 13 11 12 0 8 12H61L49 49 36 38H23Z" fill="${a}" stroke="${line}"/>`;break;
case 'mwd':shape=`<rect x="10" y="23" width="78" height="18" rx="3" fill="${steel}"/><rect x="35" y="26" width="25" height="12" rx="2" fill="#163247" stroke="${a}"/><path d="M43 35l4-6 3 6 4-4" stroke="${a}" stroke-width="1.4" fill="none"/><path d="M66 21v22" stroke="${gold}" stroke-width="3"/>`;break;
case 'nmdc':shape=`<rect x="10" y="20" width="78" height="24" rx="2" fill="${steel}" stroke="${line}"/><rect x="15" y="24" width="68" height="3" fill="#bdd0dc" opacity=".6"/><path d="M30 21v23 M70 21v23" stroke="#38546a"/>`;break;
case 'hwdp':shape=`<path d="M10 23h14v4h50v-4h14v18H74v-4H24v4H10z" fill="${steel}" stroke="${line}"/><rect x="39" y="26" width="21" height="12" fill="${gold}" opacity=".7"/>`;break;
case 'dp':shape=`<path d="M10 22h14v5h50v-5h14v20H74v-5H24v5H10z" fill="${steel}" stroke="${line}"/><path d="M16 25v14 M82 25v14" stroke="${a}" stroke-width="2"/>`;break;
case 'jar':shape=`<rect x="10" y="26" width="78" height="12" rx="2" fill="${steel}"/><rect x="37" y="19" width="30" height="26" rx="3" fill="${gold}" stroke="${line}"/><path d="M41 32h22 M54 24v16" stroke="#65431d"/>`;break;
case 'reamer':shape=`<rect x="10" y="27" width="78" height="10" rx="2" fill="${steel}"/><path d="M33 25l10-11 10 11 10-11 10 11v14L63 50 53 39 43 50 33 39z" fill="${gold}" stroke="${line}"/>`;break;
}
return `<svg viewBox="0 0 100 64" role="img" aria-label="Icône schématique ${type}" xmlns="http://www.w3.org/2000/svg"><path d="M2 32h96" stroke="#294c60" stroke-dasharray="3 3"/>${shape}</svg>`;}
root.BhaIcons={library,typeOf,svg};
})(typeof window!=='undefined'?window:globalThis);
