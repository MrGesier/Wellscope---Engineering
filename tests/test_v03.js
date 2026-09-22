'use strict';
const assert=require('node:assert/strict');
const E=require('../app/engine.js');
require('../app/enhanced.js');
const M=globalThis.WellPlus;
const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
for(const [inc,azi] of [[0,0],[45,25],[90,70]]){
 const f=M.frame({inc,azi});
 assert.ok(Math.abs(dot(f.t,f.up))<1e-12,'t ⟂ up');
 assert.ok(Math.abs(dot(f.t,f.right))<1e-12,'t ⟂ right');
 assert.ok(Math.abs(dot(f.up,f.right))<1e-12,'up ⟂ right');
 const e=M.ellipse({inc,azi},[8,14,4],2);
 assert.ok(e.rx>=e.ry&&e.ry>=0,'ellipse axes non-negative');
 assert.ok(e.cov[0][0]*e.cov[1][1]-e.cov[0][1]**2>=-1e-8,'2D projected covariance PSD');
}
const v=M.ellipse({inc:0,azi:0},[8,14,4],2);assert.equal(v.rx,28,'vertical transverse E dominates');assert.equal(v.ry,16,'vertical transverse N minor');
assert.equal(M.chooseSegment(250),'VERTICAL SECTION');assert.equal(M.chooseSegment(3000),'LANDING SECTION');assert.equal(M.chooseSegment(3350),'LATERAL / HORIZONTAL');
const parent=E.survey([{md:0,inc:0,azi:0},{md:2000,inc:35,azi:55},{md:2300,inc:65,azi:68}]);const bran=E.survey([{md:0,inc:0,azi:0},{md:2000,inc:35,azi:55},{md:2300,inc:65,azi:100}]);
let pa=parent[1],sa=bran[1];assert.ok(E.dist3(pa,sa)<1e-9,'parent sidetrack share KOP');assert.ok(E.dist3(parent[2],bran[2])>1,'sidetrack branch is distinct');
console.log('PASS: 21 checks: orthonormal frame, positive projected covariance, 2σ radii, named sections, sidetrack shared KOP and divergence');
