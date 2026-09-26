const assert=require('node:assert/strict'),C=require('../app/core'),D=require('../app/engineering-case');
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
near(C.convert(1,'tf','kN'),9.80665);near(C.convert(1,'t','kg'),1000);near(C.convert(1,'klbf','N'),4448.2216152605);near(C.convert(1,'tf.m','kN.m'),9.80665);near(C.convert(1,'ft','m'),.3048);near(C.convert(1,'in','mm'),25.4);near(C.convert(1,'US gal/min','L/min'),3.785411784);near(C.convert(1,'psi','Pa'),6894.757293168);near(C.convert(1,'sg','kg/m3'),1000);assert.throws(()=>C.convert(1,'t','tf'),/Incompatible/);assert.throws(()=>C.convert('', 'tf','kN'),/missing/);
const c=D.demo(),baseline=D.calculate(c);assert.equal(c.bha.length,12);assert.equal(c.survey.length,153);assert.equal(c.observations.length,19);near(c.bha.reduce((s,b)=>s+b.length,0),3800);assert.ok(c.bha.every(b=>b.od>b.id&&b.source));assert.ok(baseline.rows.every(r=>r.pu>=r.fr&&r.fr>=r.so));assert.equal(baseline.torqueModel,'NOT_COMPUTED');
for(const units of Object.values(D.presets)){for(const kind of Object.keys(D.base)){const v=kind==='length'?3800:123.456;near(D.canonical(D.value(v,kind,units),kind,units),v);}const copy=structuredClone(c);copy.units=structuredClone(units);assert.deepEqual(D.calculate(copy).rows,baseline.rows);}
const before=JSON.stringify(c.observations);c.settings.muOpen=.35;const higher=D.calculate(c);assert.ok(higher.rows.at(-1).pu>baseline.rows.at(-1).pu);assert.ok(higher.rows.at(-1).so<baseline.rows.at(-1).so);assert.equal(JSON.stringify(c.observations),before,'Changing the model must not regenerate observations');
const noFriction=structuredClone(c);noFriction.settings.muOpen=noFriction.settings.muCased=0;const zero=D.calculate(noFriction);zero.rows.forEach(r=>{near(r.pu,r.fr);near(r.so,r.fr);});
const offset=structuredClone(noFriction);offset.settings.blockForce+=9806.65;near(D.calculate(offset).rows.at(-1).pu-zero.rows.at(-1).pu,9806.65);
for(const [key,v]of [['mud',8000],['muOpen',-1],['bitMD',3900],['blockForce',-1],['flow',0]]){const bad=structuredClone(c);bad.settings[key]=v;assert.throws(()=>D.calculate(bad));}
assert.deepEqual(D.calculate(JSON.parse(JSON.stringify(c))).rows,D.calculate(c).rows);
console.log('PASS: exact force/mass/torque/length/flow/pressure conversions; preset round-trips; immutable mock evidence; axial friction response; zero-friction and block-offset vectors; complete case JSON and invalid inputs');

const irregular=structuredClone(c);irregular.observations[0].md=2023;assert.ok(D.calculate(irregular).rows.some(r=>r.md===2023));
for(const key of ['units','settings','sections','observations']){const bad=structuredClone(c);delete bad[key];assert.throws(()=>D.calculate(bad));}
const missingUnit=structuredClone(c);delete missingUnit.units.force;assert.throws(()=>D.calculate(missingUnit));
const badSection=structuredClone(c);badSection.sections[0].id=-1;assert.throws(()=>D.calculate(badSection));
