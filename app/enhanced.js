/* Demonstration-only local uncertainty model. 2D transverse ellipses are projections
 of ASSUMED independent N/E/TVD standard deviations; NOT ISCWSA error propagation. */
(function(root){'use strict';
const R=Math.PI/180;
function frame(p){let i=p.inc*R,a=p.azi*R;let t=[Math.sin(i)*Math.cos(a),Math.sin(i)*Math.sin(a),Math.cos(i)];let right=[-Math.sin(a),Math.cos(a),0];let up=[-Math.cos(i)*Math.cos(a),-Math.cos(i)*Math.sin(a),Math.sin(i)];return {t,right,up};}
function ellipse(p,sigmas,k=2){let {right,up}=frame(p),variance=sigmas.map(s=>s*s);let xx=right.reduce((v,x,i)=>v+x*x*variance[i],0),yy=up.reduce((v,x,i)=>v+x*x*variance[i],0),xy=right.reduce((v,x,i)=>v+x*up[i]*variance[i],0);let angle=.5*Math.atan2(2*xy,xx-yy),root=Math.hypot(xx-yy,2*xy),v1=Math.max(0,(xx+yy+root)/2),v2=Math.max(0,(xx+yy-root)/2);return {right,up,angle,rx:k*Math.sqrt(v1),ry:k*Math.sqrt(v2),cov:[[xx,xy],[xy,yy]],k};}
function transverseOffset(p,q){let {right,up}=frame(p),d=[q.n-p.n,q.e-p.e,q.tvd-p.tvd];return {x:d.reduce((v,z,i)=>v+z*right[i],0),y:d.reduce((v,z,i)=>v+z*up[i],0)};}
function chooseSegment(md){return md<500?'VERTICAL SECTION':md<950?'KOP / EARLY BUILD':md<2000?'BUILD SECTION':md<2350?'TANGENT / HOLD':md<3050?'LANDING SECTION':'LATERAL / HORIZONTAL';}
root.WellPlus={frame,ellipse,transverseOffset,chooseSegment};
})(typeof window!=='undefined'?window:globalThis);
