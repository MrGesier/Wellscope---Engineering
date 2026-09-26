/* Geometry/source review only. These checks are not a mechanical design approval. */
(function(root){
 function review(rows,steel=7850){const issues=[],bits=new Set(['pdc-bit','tricone','steel-tooth-bit','diamond-bit','impregnated-bit','hybrid-bit','core-bit']),ids=new Set();let bitCount=0;
 rows.forEach((b,i)=>{const label=`${i+1}. ${b.name||b.family||'Component'}`;
  if(!b.source?.trim())issues.push(label+': source missing.');
  if(b.family&&bits.has(b.family)){bitCount++;if(i!==0)issues.push(label+': cutting bit is not the bottom element.');}
  if(b.stable_id){if(ids.has(b.stable_id))issues.push(label+': duplicate component identity.');ids.add(b.stable_id);}
  if(b.retracted_od_m!=null&&b.expanded_od_m!=null&&b.retracted_od_m>b.expanded_od_m)issues.push(label+': retracted OD exceeds expanded OD.');
  if(b.gauge_od_m!=null&&b.gauge_od_m<b.od)issues.push(label+': declared gauge is below body OD.');
  if(b.family==='aluminium-drillpipe'||(b.density_kg_m3!=null&&b.density_kg_m3!==steel))issues.push(label+': material buoyancy differs from the axial solver global density; component-specific buoyancy is not implemented.');
  const next=rows[i+1];if(next&&b.connection_top_box&&next.connection_bottom_pin&&b.connection_top_box.trim().toUpperCase()!==next.connection_bottom_pin.trim().toUpperCase())issues.push(label+': adjacent declared connection names differ; verify manufacturer compatibility.');
 });if(bitCount>1)issues.push('Multiple cutting bits declared in one string; review assembly intent.');if(!rows.some(b=>b.family))issues.push('Tool types are unclassified; assign explicit catalog identities before checking bit placement.');return issues;
 }
 root.ToolIntegrity={review};if(typeof module==='object')module.exports=root.ToolIntegrity;
})(globalThis);
