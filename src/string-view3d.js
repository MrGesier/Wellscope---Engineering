import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
const palette = [0xac7747, 0x476d83, 0x7b8775, 0xa78b55, 0x677f8d, 0x8f7770];
function create(host, onPick) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  host.append(renderer.domElement);
  renderer.domElement.style.cssText =
    "width:100%;height:480px;display:block;touch-action:none";
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#eef1f2");
  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 10000);
  camera.position.set(30, 10, 40);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x68727b, 2));
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(15, 30, 20);
  scene.add(light);
  let group = new THREE.Group(),
    targets = [],
    data = null;
  scene.add(group);
  const render = () => {
    const width = Math.max(1, host.clientWidth),
      height = 480;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };
  controls.addEventListener("change", render);
  const resize = new ResizeObserver(render);
  resize.observe(host);
  function clear() {
    group.traverse((o) => {
      o.geometry?.dispose();
      if (o.material)
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          m.dispose();
    });
    scene.remove(group);
    group = new THREE.Group();
    scene.add(group);
    targets = [];
  }
  function geometry(d, heat, max) {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(d.positions, 3),
    );
    g.setIndex(d.indices);
    g.computeVertexNormals();
    if (heat) {
      const values = [];
      for (const v of d.values) {
        const c = new THREE.Color().setHSL(
          0.6 * (1 - Math.min(1, v / Math.max(1, max))),
          0.65,
          0.5,
        );
        values.push(c.r, c.g, c.b);
      }
      g.setAttribute("color", new THREE.Float32BufferAttribute(values, 3));
    }
    return g;
  }
  function update(model, options) {
    clear();
    data = model;
    if (!model) {
      render();
      return;
    }
    for (const p of model.parts) {
      const geom = geometry(p, options.heat, options.maxStress),
        mat = new THREE.MeshStandardMaterial({
          color: options.heat ? 0xffffff : palette[p.index % 6],
          vertexColors: options.heat,
          roughness: 0.5,
          metalness: 0.35,
          side: THREE.DoubleSide,
        });
      const m = new THREE.Mesh(geom, mat);
      m.userData = { component: p.index };
      group.add(m);
      targets.push(m);
      if (options.wire) {
        const line = new THREE.LineSegments(
          new THREE.WireframeGeometry(geom),
          new THREE.LineBasicMaterial({
            color: 0x243e4c,
            transparent: true,
            opacity: 0.22,
          }),
        );
        group.add(line);
      }
    }
    if (options.bore !== "hidden")
      for (const b of model.bores) {
        const geom = geometry(
          options.bore === "cut" ? b.cut : b.full,
          false,
          1,
        );
        group.add(
          new THREE.Mesh(
            geom,
            new THREE.MeshStandardMaterial({
              color: b.kind === "OPEN" ? 0xc4aa79 : 0x708b97,
              transparent: true,
              opacity: options.bore === "cut" ? 0.27 : 0.12,
              depthWrite: false,
              side: THREE.DoubleSide,
              roughness: 0.9,
            }),
          ),
        );
      }
    for (const n of model.nodes) {
      if (!options.nodes && !n.contact) continue;
      const radius =
          Math.max(0.015, model.scale * 0.004) * (n.contact ? 1.6 : 1),
        m = new THREE.Mesh(
          new THREE.SphereGeometry(radius, 8, 6),
          new THREE.MeshBasicMaterial({
            color: n.contact ? 0xb63129 : 0x273c47,
          }),
        );
      m.position.fromArray(n.point);
      m.userData = { md: n.md, component: n.component };
      group.add(m);
      targets.push(m);
    }
    render();
  }
  function fit() {
    if (!data) return;
    const box = new THREE.Box3().setFromObject(group),
      center = box.getCenter(new THREE.Vector3()),
      size = box.getSize(new THREE.Vector3()).length();
    controls.target.copy(center);
    const nodes = data.nodes,
      tangent =
        nodes.length > 1
          ? new THREE.Vector3()
              .fromArray(nodes.at(-1).centerPoint)
              .sub(new THREE.Vector3().fromArray(nodes[0].centerPoint))
              .normalize()
          : new THREE.Vector3(0, 1, 0),
      up =
        Math.abs(tangent.y) > 0.9
          ? new THREE.Vector3(1, 0, 0)
          : new THREE.Vector3(0, 1, 0),
      side = new THREE.Vector3().crossVectors(tangent, up).normalize();
    camera.position.copy(center).add(
      side
        .addScaledVector(tangent, 0.2)
        .addScaledVector(up, 0.25)
        .normalize()
        .multiplyScalar(Math.max(2, size) * 1.5),
    );
    camera.near = 0.005;
    camera.far = Math.max(10000, size * 10);
    camera.updateProjectionMatrix();
    controls.update();
    render();
  }
  let down;
  renderer.domElement.addEventListener(
    "pointerdown",
    (e) => (down = [e.clientX, e.clientY]),
  );
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5)
      return;
    const rect = renderer.domElement.getBoundingClientRect(),
      ray = new THREE.Raycaster();
    ray.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      camera,
    );
    const hit = ray.intersectObjects(targets)[0];
    if (hit) onPick(hit.object.userData);
  });
  return {
    update,
    fit,
    render,
    controls,
    camera,
    snapshot: () => ({
      meshes: data?.parts.length || 0,
      nodes: data?.nodes.length || 0,
      position: camera.position.toArray(),
      target: controls.target.toArray(),
    }),
  };
}
window.StringView3D = { create };
