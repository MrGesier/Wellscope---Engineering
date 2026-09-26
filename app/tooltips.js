/* English-language engineering explanations for the independent WellScope alpha.
 * Help text is educational and never provides operational clearance or setpoints. */
(()=>{'use strict';
const HELP={
  overview:'Orbit the local 3D representation of the reference trajectory, two neighbouring offsets and a synthetic sidetrack. Click a reference survey station to synchronize the selected depth with the other views. Apparent sizes and axes are illustrative, not a georeferenced clearance study.',
  trajectory:'Build a centreline trajectory from increasing measured depths, inclinations and azimuths using the minimum-curvature method. N/E/TVD and local dogleg severity are recalculated from the supplied stations. No geodetic datum, grid convergence, magnetic correction or survey error model is applied.',
  collision:'Compares reference survey positions with the nearest points on sampled offset-well polylines. The transverse ellipses are projections of user-assumed independent N/E/TVD standard deviations. This is NOT an ISCWSA anticollision calculation and cannot establish safe separation.',
  td:'Displays an axial-only, segmented soft-string screening model. The estimate integrates component buoyed weight and a simplified friction term from bit to surface. It does not calculate torsional torque, actual contact forces, stiffness, buckling, fatigue or approved hookload limits.',
  bha:'Build a string from the bit upward using schematic tool-family icons and editable dimensions. Component length and linear mass feed the current preliminary axial-load calculation. Motor bends, stabilizer blade contact, BHA steering and manufacturer operating limits are not simulated.',
  report:'Generates a local preliminary case summary with assumptions, geometry and limited calculated outputs. Exported reports are teaching documents, not verified well engineering studies. The source register identifies references reviewed, not implemented proprietary algorithms.',
  btnsave:'Download the complete current case state as a JSON file. The export includes synthetic surveys, component dimensions and settings; review before sharing if you have entered real project data.',
  btnload:'Load a previously saved WellScope JSON case. Loading replaces current survey, BHA and scenario settings. Only import data from a trusted source.',
  applyref:'Parse the reference md,inc,azi CSV, validate station order and angle ranges, and recalculate the local minimum-curvature path and dependent preliminary views.',
  exportcsv:'Export calculated reference survey stations in CSV format: md, inc, azi, tvd, n, e and dls. These coordinates use the local demonstration frame rather than a surveyed geodetic reference.',
  resetdemo:'Restore the built-in synthetic reference and offset trajectories, sidetrack and demonstration placements. This discards unsaved changes to these trajectory inputs.',
  applyoffset:'Update Offset A placement, hole radii and the assumed standard deviations used to draw the ellipses. This does not calculate or approve an ISCWSA separation factor.',
  applymultioff:'Recalculate Offset B and sidetrack geometry after importing or editing their surveys and origins. The demonstration sidetrack starts from a parent survey station at 2,000 mMD.',
  applytd:'Recompute pickup, slackoff and static axial estimates with the entered mud density, friction coefficient and BHA. Surface hookload is a model output, not an approved equipment rating or a predicted measured hookload.',
  applybha:'Validate component lengths, outside and inside diameters, and linear masses; then update the string geometry and axial-weight calculation. Schematic tool icons do not supply actual manufacturer properties.',
  addbha:'Add a generic drill-pipe row to the end of the string. Replace its synthetic default dimensions and linear mass with suitable verified values before an engineering analysis.',
  printreport:'Open the preliminary report and invoke the browser Print dialog. Select Save as PDF in the browser if desired. The document explicitly excludes operational anticollision and mechanical approval.',
  exportjson:'Download the current editable case as JSON for later import. It stores numerical assumptions and synthetic survey data; it is not a signed or approved engineering deliverable.',
  showoffset:'Toggle the main neighbouring well (Offset A) in the 3D overview. Hiding a well in the view does not remove it from the numerical proximity calculation.',
  showoffsetB:'Toggle the second neighbouring well (Offset B) in the 3D overview. Numerical screening still includes this well when the trace is hidden.',
  showellipses:'Show or hide illustrative 2σ uncertainty contours in the 3D overview. The visual shapes come from arbitrary entered standard deviations, not ISCWSA survey error propagation.',
  showbha:'Show or hide the schematic drillstring/BHA in the 3D overview. This display does not calculate component stress, bit dynamics or real-time drilling measurements.',
  showsidetrack:'Show or hide the synthetic daughter-borehole branch after the 2,000 mMD kickoff. Pre-kickoff shared parent geometry is not an independent-well collision.',
  refcsv:'Import a UTF-8 CSV with header md,inc,azi. MD is measured depth in metres, inc is inclination from vertical in degrees, and azi is clockwise azimuth in degrees relative to the same local reference. MD must strictly increase.',
  offcsv:'Import Offset A survey stations using the same md,inc,azi convention as the reference. Then enter initial North and East translations in the shared local frame. No coordinate-reference-system matching is performed.',
  offBfile:'Import Offset B md,inc,azi surveys. Its starting point is translated by the Offset B origin fields; verify all well origins and survey references independently.',
  sidefile:'Import the synthetic sidetrack survey using md,inc,azi with a station exactly at 2,000 mMD. At that point the branch is aligned to the parent centreline; only post-kickoff branch geometry is compared as a distinct path.',
  station_slider:'Select the reference survey station by index. This moves the depth marker and updates the transverse plane and local axial-load readout. This is a discrete survey selector, not continuous real-time logging.',
  ac_depthslider:'Change the reference survey station used for the transverse anticollision illustration. The offset point is projected into the local plane normal to the reference tangent; this plane is not an ISCWSA separation-rule implementation.',
  acfocus:'Select Offset A, Offset B or the sidetrack as the neighbouring trajectory in the enlarged transverse section. Other wells remain in the 3D and plan views.',
  offnorth:'Translation of Offset A survey origin toward geographic/local North, in metres relative to the reference origin. A negative value shifts it south. Both wells must share a defined origin for any actual study.',
  offeast:'Translation of Offset A survey origin toward local East, in metres. A negative value shifts it west. This synthetic setting does not perform geodetic coordinate conversion.',
  offBnorth:'Offset B origin displacement along local North relative to the reference origin, in metres. Use a common coordinate frame for all trajectories.',
  offBeast:'Offset B origin displacement along local East relative to the reference origin, in metres. This exercise only uses local Cartesian coordinates.',
  rref:'Physical radius of the reference hole, in metres. Enter the effective borehole radius rather than bit diameter. The displayed nominal physical gap is centreline separation minus both entered hole radii.',
  roff:'Physical radius assigned to the neighbouring hole, in metres. The current model subtracts reference and offset radii from centreline distance; it does not include casing, cement or an approved stand-off allowance.',
  sref:'Assumed one-standard-deviation uncertainty of reference-well North position, in metres. It is a manually entered visual parameter independent of depth, NOT a calculated survey-instrument error.',
  srefE:'Assumed one-standard-deviation uncertainty of reference-well East position, in metres. Combined with North and TVD entries as a diagonal matrix for ellipse visualization only.',
  srefV:'Assumed one-standard-deviation uncertainty of reference-well TVD, in metres. This is an illustrative independent vertical variance, not derived from instrument calibration.',
  soff:'Assumed one-standard-deviation North uncertainty for the offset well, in metres. For simplicity the same value is used for all offsets; it is NOT a validated offset-well survey quality estimate.',
  soffE:'Assumed one-standard-deviation East uncertainty for the offset well, in metres. Real error models include correlated terms that are absent here.',
  soffV:'Assumed one-standard-deviation TVD uncertainty for offset wells, in metres. This value only affects illustrative transverse contours.',
  mud:'Mud density in kg/m³ used for the simplified buoyancy factor 1 − mud density / steel density. Actual buoyancy and hydraulic forces depend on fluid distribution and operating conditions.',
  friction:'Dimensionless assumed wall-friction coefficient μ used as friction = μ × approximate normal force. Real friction is operation-, fluid- and well-condition-dependent and should be calibrated to field measurements.',
  steel:'Nominal steel density (kg/m³) used in the simplified buoyancy factor for all components. The model does not distinguish non-steel tool materials or hollow-fluid differential effects.',
  bitforce:'Axial force boundary condition applied at the bit, in the selected force unit, for the bottom-up screening calculation. This input is not automatically a physically correct WOB, motor thrust or weight-on-bit estimate for every operating mode.',
  hookref:'Optional entered observed/reference surface hookload (selected force unit) shown alongside the preliminary model output. This alpha does not fit friction to measured pickup/slackoff or evaluate model residuals.',
  hookcap:'Optional nominal rig/equipment hookload rating (selected force unit), shown for information only. It is NOT the allowable string load or a safety limit; actual limits depend on rig, hoisting system, connections, design factors and approved procedures.',
  reftext:'Edit reference well surveys as a CSV table (md,inc,azi). MD is metres along hole, inclination is degrees from vertical, azimuth is degrees clockwise from the chosen North reference. The first station defines the local coordinate origin.',
  offtext:'Edit Offset A surveys as md,inc,azi rows. The numeric North/East origin fields translate the entire offset trajectory relative to the reference.',
  offBtext:'Edit Offset B surveys as md,inc,azi rows. Offset B origin shifts the trajectory in the local North/East frame.',
  sidetext:'Edit the sidetrack survey. Include the parent trajectory through the 2,000 mMD kickoff station, followed by the deviated branch; pre-kickoff values are excluded from neighbour screening.',
  scene:'Projected 3D trajectory, not a 3D finite-element solver. Drag to rotate and scroll to zoom. Small assumed uncertainty contours can be difficult to distinguish over kilometre-scale lengths; use the zoomed transverse panel.',
  acscene:'All demonstration well centrelines are shown together. The sidetrack shares the parent trajectory until kickoff. The 2σ contours are hypothetical geometric projections and must not be interpreted as an accepted anticollision envelope.',
  plan:'Small North/East overview of the trajectories. A plan view discards TVD information and therefore cannot establish three-dimensional separation.',
  accross:'Enlarged transverse plane normal to the reference well tangent. The ellipses result from projecting manually assumed diagonal North/East/TVD variances; cross-well correlation, survey tools and confidence calibration are not included.',
  acplan:'North–East plan projection of reference, offsets and sidetrack. Vertical separation is invisible in plan; use full 3D and a validated anticollision workflow for real wells.',
  acplot:'Plots sampled geometric centreline distance and nominal physical gap against reference MD. The nominal physical gap only subtracts entered borehole radii; it is not the distance between uncertainty envelopes.',
  tdscene:'Schematic 3D well path annotated with preliminary local axial pickup loads by section. Local axial load differs from surface hookload and does not give torque, contact force or acceptable operating margins.',
  tdplot:'Local axial load (selected force unit) against reference MD for pickup, slackoff and static modes. Curve differences are generated by a simplified friction sign; this is not a validated hookload envelope.',
  trajectoryplot:'Reference path profile based on calculated minimum-curvature N/E/TVD at discrete stations. These values have not been tied to a geodetic datum or corrected for survey-tool error.',
  bhaplot:'Schematic component stack drawn out of scale. The chart shows order and entered component lengths; it does not model beam bending, stabilizer contact, motor response or vibrations.',
  toolgallery:'Eleven simplified BHA equipment families. Choose an icon to insert a synthetic example component before drill pipe, then edit actual length, OD, ID and mass per metre. Icons are not manufacturer schematics.',
  bhatable:'The BHA list is entered from bit toward surface. Every row needs positive length, positive outside diameter, non-negative inside diameter smaller than OD, and positive linear mass.',
  sectionstrip:'Select a named interval of the demonstration path: vertical, kickoff/build, build, tangent/hold, landing or lateral. The displayed number is a nearby discrete-station axial pickup estimate, not a section-specific engineering limit.',
  k_md:'Bit measured depth is the along-hole distance from the MD reference, in metres. It is not TVD. This demo uses the final survey station as bit depth.',
  k_tvd:'True vertical depth is the computed vertical displacement from the local starting reference. The demonstration does not apply elevation, subsea datum or geodetic transformations.',
  k_dls:'Dogleg severity is the angular change in borehole direction normalized to 30 m of measured-depth interval, in degrees/30 m. Survey spacing influences the reported local DLS.',
  k_sep:'Minimum sampled nominal centreline distance to any demo offset or post-kickoff sidetrack, in metres. It does not account for physical radii, propagated positional uncertainty or approval rules.',
  k_pu:'Surface pickup hookload estimate (selected force unit) for pulling the string in the simplified segmented soft-string model. This is not a measured or allowable rig load.',
  k_so:'Surface slackoff hookload estimate (selected force unit) for lowering the string in the simplified axial model. The model is not calibrated to field friction.',
  k_st:'Static surface axial-load estimate (selected force unit) without a movement-direction friction term. It is not an actual measured hookload and excludes numerous dynamic/pressure effects.',
  k_acmin:'Minimum sampled 3D centreline distance between the reference surveys and available demo neighbouring centreline segments. A small number is not itself a validated collision-risk measure.',
  k_acdepth:'Reference measured depth (mMD) of the survey station at which the minimum sampled centreline distance occurs. This is not necessarily the absolute closest point between continuous borehole paths.',
  k_bhalen:'Sum of all entered BHA and drillstring component lengths (m), including synthetic drill pipe to surface. It must cover bit MD for the axial screening engine.',
  k_bhamass:'Sum of component length multiplied by entered linear mass, reported as metric tonnes. This is a dry string mass estimate, not buoyed weight or hookload.',
};
const TERMS={
 '3D well trajectory · interactive projection':HELP.scene,
 'Selected survey station':'Station MD, inclination (INC), azimuth (AZI), North/East/TVD and local DLS values are taken from the selected reference survey. Moving the station slider synchronizes the map and analysis panels.',
 'Engineering status':'Checks the presence and basic mathematical validity of input geometry. Green geometry checks do not validate the physical models or permit drilling decisions.',
 'Plan / section view':HELP.plan,
 'Reference well · surveys':'Reference survey measurements are the basis for the calculated trajectory. Minimum curvature assumes a smooth directional change between survey stations; the input must share one consistent depth and azimuth reference.',
 'Survey station table':'Calculated survey attributes: MD (measured depth), INC (inclination), AZI (azimuth), TVD (true vertical depth), N/E (local Cartesian coordinates), DLS (dogleg severity). Values are not geodetically tied to a real well.',
 'Trajectory profile':HELP.trajectoryplot,
 'Multiwell · 3D visualization':HELP.acscene,
 'Wellbore transverse plane':HELP.accross,
 'Plan view · offset & sidetrack':HELP.acplan,
 'Offset well':'Offset A is the first neighbouring well. Import its surveys, set its synthetic North/East origin, and adjust the assumed display uncertainties. No real coordinate matching or survey error propagation is performed.',
 'Center-to-center separation':HELP.acplot,
 'Multiwell datasets · import / edit':'Each CSV represents a well survey using md,inc,azi. Local origins for Offset A/B are manually entered. The sidetrack shares its parent at the fixed demonstration kickoff depth of 2,000 mMD.',
 'Offset B':'A second neighbouring well to compare with the reference and sidetrack. Its initial North and East shifts are manually entered in the common local coordinate frame.',
 'Sidetrack':'A daughter well drilled from an existing parent borehole after a kickoff point. Its pre-kickoff shared path must not be counted as a separate-well anticollision encounter. This is a synthetic geometry-only example.',
 'Axial-load map · by wellbore section':HELP.tdscene,
 'Calculation inputs':'All values on this panel are assumptions or manually supplied inputs. The current solver estimates only axial loads, does not calculate rigorous torque, and is not calibrated for a particular rig or well.',
 'Assumptions & exclusions':'The solver integrates a simplified buoyed string weight and approximate friction at discrete survey segments. It omits a stiff-string contact model, actual distributed forces, buckling, torque transmission and manufacturer limit checks.',
 'Surface hookload estimate':'Approximate surface axial force obtained by summing segment contributions from bit to surface. Pickup and slackoff represent different assumed motion directions, not a verified operational hookload envelope.',
 'Observed / assumed inputs':'Manually entered observed hookload and nominal rating are displayed for reference only. They do not feed a pass/fail decision, and they are not calibrated against actual field data.',
 'Visual tool library':HELP.toolgallery,
 'String components · bottom → top':HELP.bhatable,
 'String anatomy':HELP.bhaplot,
 'Case summary':'This locally generated preliminary engineering summary distinguishes calculated outputs from synthetic inputs and explicitly records model exclusions. It is not a signed field report.',
 'Model qualification':'An implemented numerical function may be unit-tested without being qualified for operational drilling. Screening-only calculations must be validated against approved reference cases and actual equipment data before field use.',
 'Reviewed references':'These links identify materials that informed the prototype requirements. They do not imply that the referenced proprietary commercial solver or ISCWSA uncertainty model has been reproduced or independently validated.',
};
const FAMILIES={
 pdc:'Polycrystalline diamond compact (PDC) fixed-cutter bit. Cutting structure, bit profile, gauge length and formation interaction influence steerability and walk. This icon is schematic; no bit–rock directional solver is included.',
 tricone:'Rolling-cone drilling bit with rotating cutter cones. Diameter, cone/bearing design and formation interact during drilling. The demo stores approximate geometry and mass only.',
 motor:'Positive-displacement mud motor (PDM), a downhole hydraulic motor that rotates the bit using circulating mud. Bend angle, housing geometry, flow rate and differential pressure affect actual response; none are simulated in this alpha.',
 rss:'Rotary steerable system (RSS), which steers while the drillstring rotates using push-the-bit pads or point-the-bit deflection. Pad force, activation, hole overgauge, bit steerability and rock properties are not simulated.',
 stab:'Stabilizer, a near-gauge contact element with blades. Diameter, gauge/overgauge and distance from bit can strongly affect BHA build/drop/turn. This version does not calculate blade-to-wall contact or directional response.',
 mwd:'Measurement-while-drilling / logging-while-drilling assembly. Carries downhole inclination, azimuth and other sensors. Sensor offsets and BHA sag can influence survey positioning, but no correction is calculated here.',
 nmdc:'Non-magnetic drill collar / drill collar, a heavy and comparatively stiff tubular. In a full model its dimensions and material affect rigidity and bending; this alpha only uses length and linear mass for axial screening.',
 hwdp:'Heavy-weight drill pipe (HWDP) is a transition between drill collars and drill pipe, with different stiffness and mass per length. Connection ratings and buckling behaviour are not solved.',
 dp:'Drill pipe transmits axial loads, torque and drilling fluid between rig and BHA. Actual tool-joint diameters, grades, connections, wear and combined loads are outside the simplified model.',
 jar:'Drilling jar stores and releases an impact impulse to help free a stuck string. Stroke, trigger load and dynamic loading require an equipment-specific analysis, which is not included.',
 reamer:'Reamer or hole opener enlarges or conditions the wellbore. Cutter geometry and borehole contact can influence torque, drag and vibration; only illustrative geometry and mass are stored.'
};
let overlay=null,active=null,pinned=false;
const closestTarget=e=>e.target&&e.target.closest&&e.target.closest('[data-help]');
function hide(){if(overlay){overlay.hidden=true}if(active)active.setAttribute('aria-expanded','false');active=null;pinned=false;}
function show(el,pin=false){const message=el.getAttribute('data-help');if(!message)return;if(active===el&&pinned&&pin){hide();return;}active=el;pinned=pin;overlay.textContent=message;overlay.hidden=false;overlay.setAttribute('role','tooltip');el.setAttribute('aria-expanded',String(pin));let rect=el.getBoundingClientRect(),width=Math.min(400,window.innerWidth-24);overlay.style.maxWidth=width+'px';let left=Math.max(12,Math.min(window.innerWidth-width-12,rect.left));overlay.style.left=left+'px';overlay.style.top='12px';let size=overlay.getBoundingClientRect();let top=rect.bottom+9;if(top+size.height>window.innerHeight-8)top=rect.top-size.height-9;overlay.style.top=Math.max(8,top)+'px';}
function addIcon(el,desc){if(!el||!desc||el.querySelector('.help-trigger'))return;const span=document.createElement('span');span.className='help-trigger';span.tabIndex=0;span.setAttribute('role','button');span.setAttribute('aria-label','Explain: '+el.textContent.trim().slice(0,62));span.setAttribute('data-help',desc);span.textContent='i';const input=el.matches('label')&&el.closest('.formgrid,.depthinput')?el.querySelector('input,select,textarea'):null;if(input)el.insertBefore(span,input);else el.appendChild(span);}
function initialize(){overlay=document.createElement('div');overlay.className='help-popover';overlay.id='wellscope-help';overlay.hidden=true;document.body.appendChild(overlay);
  HELP['station-slider']=HELP.station_slider; HELP['ac-depthslider']=HELP.ac_depthslider;
  for(const [id,description] of Object.entries(HELP)){
    let el=document.getElementById(id);if(!el)continue;
    if(el.matches('input,textarea,select')){let label=el.closest('label');if(label){addIcon(label,description);}else {el.setAttribute('data-help',description);el.setAttribute('aria-description',description);el.setAttribute('tabindex','0');}}
    else if(el.matches('canvas')){el.setAttribute('data-help',description);el.setAttribute('tabindex','0');el.setAttribute('aria-description',description);let panel=el.closest('.panel');if(panel){let h=panel.querySelector('.panel-title h2');if(h)addIcon(h,description);}}
    else if(el.matches('button'))el.setAttribute('data-help',description);
    else if(el.matches('.kpis,.tablebox')){let h=el.closest('.panel')?.querySelector('h2');if(h)addIcon(h,description);}
  }
  for(const btn of document.querySelectorAll('[data-page]')){btn.setAttribute('data-help',HELP[btn.dataset.page]||'Open this engineering module.');}
  for(const label of document.querySelectorAll('.formgrid label,.toggles label,.focusbar label,.depthinput')){const input=label.querySelector('input,select');if(input&&HELP[input.id])addIcon(label,HELP[input.id]);}
  for(const head of document.querySelectorAll('h2')){const k=head.textContent.trim();if(TERMS[k])addIcon(head,TERMS[k]);}
  for(const th of document.querySelectorAll('th')){let s=th.textContent.trim();let d={MD:'Measured depth (MD): distance along the well path from the measurement datum, in metres.',INC:'Inclination (INC): angle of the wellbore tangent from vertical, in degrees.',AZI:'Azimuth (AZI): clockwise compass bearing of the well path from the chosen North reference, in degrees.',TVD:'True vertical depth (TVD): computed vertical displacement from the local starting datum, in metres.',N:'North coordinate (m) in the local Cartesian survey frame.',E:'East coordinate (m) in the local Cartesian survey frame.',DLS:'Dogleg severity: direction change normalized to 30 m of MD, in degrees/30 m.','Ref MD':'Reference-well measured depth (mMD) at the sampled proximity station.','Offset MD*':'Interpolated measured depth of the nearest point on a straight segment of the offset trajectory.','Centreline distance':'Geometric centre-to-centre distance of two sampled paths in three dimensions; no survey uncertainty is included.','Nominal physical gap*':'Centreline distance minus the entered physical borehole radii. It is NOT an approved stand-off distance or uncertainty-envelope separation.','L (m)':'Component length in metres, measured from bit toward surface. The total of entered lengths must cover bit MD.','OD (m)':'Outside diameter in metres; use manufacturer tool-body dimensions for real engineering.','ID (m)':'Inside diameter in metres; required to be smaller than outside diameter.','kg/m':'Linear dry mass in kilograms per metre; it affects estimated string weight.','Name / type':'Editable component name. Tool classification uses a name-based schematic icon only.'}[s];if(d)addIcon(th,d);}
  const kpi={'BIT DEPTH':HELP.k_md,'TRUE VERTICAL DEPTH':HELP.k_tvd,'MAX DOGLEG':HELP.k_dls,'MIN CENTER DISTANCE':HELP.k_sep,'PICKUP':HELP.k_pu,'SLACKOFF':HELP.k_so,'STATIC':HELP.k_st,'MIN DISTANCE':HELP.k_acmin,'REFERENCE DEPTH':HELP.k_acdepth,'TOTAL STRING LENGTH':HELP.k_bhalen,'ESTIMATED DRY MASS':HELP.k_bhamass};
  for(const t of document.querySelectorAll('.kpis article > div')){const label=t.textContent.trim().replace(/\s+MD$/,'').trim();if(kpi[label])addIcon(t,kpi[label]);}
  for(const el of document.querySelectorAll('.minirow > span')){let label=el.textContent.trim();let matching={'MD':HELP.k_md,'INC / AZI':'Inclination is the angle from vertical; azimuth is the clockwise bearing from the chosen local North reference. Both are shown in degrees.','N / E / TVD':HELP.k_tvd,'DLS local':HELP.k_dls,'Entered reference hookload':HELP.hookref,'Entered nominal equipment rating':HELP.hookcap,'Surface torque':HELP.td,'Selected section / axial pickup':HELP.sectionstrip,'String components':HELP.bhatable}[label];if(matching)addIcon(el,matching);}
  for(const el of document.querySelectorAll('.scenario'))el.setAttribute('data-help','Load a synthetic offset placement scenario and recompute sampled geometric separation. These example well positions and uncertainty contours are not based on field surveys.');
  document.addEventListener('pointerover',e=>{const el=closestTarget(e);if(el&&!pinned)show(el);});
  document.addEventListener('pointerout',e=>{const el=closestTarget(e);if(el&&!pinned&&active===el&&!el.contains(e.relatedTarget))hide();});
  document.addEventListener('focusin',e=>{const el=closestTarget(e);if(el&&!pinned)show(el);});
  document.addEventListener('focusout',e=>{const el=closestTarget(e);if(el&&!pinned&&active===el)hide();});
  document.addEventListener('click',e=>{const el=closestTarget(e);if(el&&el.classList.contains('help-trigger')){e.preventDefault();e.stopPropagation();show(el,true)}else if(!overlay.contains(e.target))hide();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();if((e.key==='Enter'||e.key===' ')&&e.target.classList.contains('help-trigger')){e.preventDefault();show(e.target,true)}});
  window.addEventListener('resize',hide);
}
window.WellHelp={HELP,TERMS,FAMILIES};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);else initialize();
})();
