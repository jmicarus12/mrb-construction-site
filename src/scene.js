/* ===================================================================
   The site — MRB Construction Services
   A Three.js diorama of a construction lot. The lot, fence, site office
   and project signboard are always there; on the concrete pad one of
   four scenes is built at a time:

     ceiling   a room with a halo LED ceiling, half framed, half finished
     cabinets  a kitchen with tall wood-grain units and an island
     glass     a two-storey house with blue reflective sliding windows
     roofing   a bungalow getting its clay tiles and a coat of paint

   Hotspots open the panels in site.js:
     site office → about     signboard → contact     scene → its service

   Every object is a `part` so it can drop in during the build and sink
   away when the scene changes. Coordinates: pad top is y = 0.
   =================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CONFIG, SCENES } from './content.js';

const root = document.documentElement;
const MRB = window.MRB || (window.MRB = {});
const reduced = root.classList.contains('reduced');
const sceneTitle = Object.fromEntries(SCENES.map(s => [s.key, s.title]));

const canvas = document.getElementById('scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  root.classList.add('no-webgl');
  throw e;
}
// 1.5 is sharp on retina at a fraction of the cost of 2 (smoother camera moves)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 120);

// a soft studio environment, mostly for the glass to have something to reflect
const envTex = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envTex;
scene.environmentIntensity = 0.25;

/* ---- palette ----------------------------------------------------------- */
const C = {
  soil: '#c9b799', concrete: '#c6c3bc', joint: '#a8a49c',
  charcoal: '#2c3038', slate: '#454b55', white: '#f3f2ee', plaster: '#c4ad8c', trim: '#e7e5df',
  blue: '#2f9bff', led: '#7fd2ff', navy: '#1c2f5a', alu: '#e6e8eb', steel: '#b9bfc6', black: '#1d1f23',
  oak: '#b58456', oakDark: '#8a5f3b', terracotta: '#b4532f',
  orange: '#ff7a1a', yellow: '#f5b301', skin: '#c98e63', jeans: '#34466b', rattan: '#c99a5b'
};
const mats = {};
function mat(color, roughness = 0.75, metalness = 0) {
  const k = color + roughness + metalness;
  return mats[k] || (mats[k] = new THREE.MeshStandardMaterial({ color, roughness, metalness }));
}
const glow = color => new THREE.MeshBasicMaterial({ color, toneMapped: false });
const glassBlue = new THREE.MeshPhysicalMaterial({
  color: '#1f4f9c', metalness: 0.55, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.04,
  envMap: envTex, envMapIntensity: 1.8
});
const glassClear = new THREE.MeshPhysicalMaterial({
  color: '#cfe3ee', metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.35,
  envMap: envTex, envMapIntensity: 1.2, depthWrite: false
});

/* ---- lights ------------------------------------------------------------ */
scene.add(new THREE.HemisphereLight(0xf3f6fa, 0x8a8172, 1.7));
const sun = new THREE.DirectionalLight(0xfff1e0, 2.3);
sun.position.set(7, 12, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 34 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xdfe9ff, 0.45);
fill.position.set(-6, 5, 8);
scene.add(fill);

/* ---- build helpers ------------------------------------------------------
   scenario() collects the parts built inside it; part() starts a new
   top-level group and every helper adds to the current group.          */
const newSet = key => ({ key, parts: [], hot: [], ticks: [], state: 'hidden', start: null, exit: null, end: 0 });
const site = newSet(null);          // always there
const SC = {};                      // the four scenes
let S = site, cur = scene;

function scenario(key, build) {
  S = SC[key] = newSet(key);
  build();
  S = site;
  cur = scene;
}
function part(name, from = 'above', hotspot = null) {
  const g = new THREE.Group();
  g.name = name;
  g.userData.from = from;
  if (hotspot) { Object.assign(g.userData, hotspot); S.hot.push(g); }
  g.visible = false;
  scene.add(g);
  S.parts.push(g);
  cur = g;
  return g;
}
const tick = fn => S.ticks.push(fn);

function add(mesh, x, y, z, o = {}) {
  mesh.position.set(x, y, z);
  if (o.rx) mesh.rotation.x = o.rx;
  if (o.ry) mesh.rotation.y = o.ry;
  if (o.rz) mesh.rotation.z = o.rz;
  mesh.castShadow = o.cast !== false;
  mesh.receiveShadow = true;
  cur.add(mesh);
  return mesh;
}
const box = (w, h, d, m, x, y, z, o) => add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m), x, y, z, o);
const rbox = (w, h, d, r, m, x, y, z, o) => add(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), m), x, y, z, o);
const cyl = (rt, rb, h, m, x, y, z, o = {}) => add(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg || 24), m), x, y, z, o);
const sph = (r, m, x, y, z, o) => add(new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), m), x, y, z, o);
const plane = (w, h, m, x, y, z, o = {}) => add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), m), x, y, z, { cast: false, ...o });

function group(x, y, z, o = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (o.rx) g.rotation.x = o.rx;
  if (o.ry) g.rotation.y = o.ry;
  if (o.rz) g.rotation.z = o.rz;
  cur.add(g);
  return g;
}
function within(g, fn) { const prev = cur; cur = g; fn(); cur = prev; return g; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
function rod(a, b, r, m) {
  const d = b.clone().sub(a), len = d.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), m);
  mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, d.normalize());
  mesh.castShadow = true;
  cur.add(mesh);
  return mesh;
}

const maxAniso = renderer.capabilities.getMaxAnisotropy();
const textTex = [];
function canvasTex(w, h, draw, o = {}) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...o.repeat); }
  t.redraw = () => { draw(cv.getContext('2d'), w, h); t.needsUpdate = true; };
  t.redraw();
  if (o.text) textTex.push(t);
  return t;
}
const DISPLAY = '"Archivo", "Arial Black", Arial, sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';

/* soft additive glow on a plane: LED wash, light pools, beams */
function glowTex(kind) {
  return canvasTex(256, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    let g;
    if (kind === 'radial') {
      g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.45, 'rgba(255,255,255,0.35)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
    } else {               // 'down': bright at the top edge, fading down
      g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.3, 'rgba(255,255,255,0.4)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
    }
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
  });
}
const radialTex = glowTex('radial'), downTex = glowTex('down');
const glowMat = (tex, color, opacity) => new THREE.MeshBasicMaterial({
  map: tex, color, transparent: true, opacity, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending
});

/* ---- workers ---------------------------------------------------------------
   Chibi crew: big head, hard hat, hi-vis vest. Arms hang from shoulder
   pivots; rotation.x = -PI/2 points an arm straight forward.            */
function worker(x, y, z, o = {}) {
  const w = group(x, y, z, { ry: o.ry || 0 });
  const prev = cur;
  cur = w;
  const jeans = mat(C.jeans, 0.85), skin = mat(C.skin, 0.6), shirt = mat(o.shirt || '#eef0f2', 0.8);
  const legs = [-0.075, 0.075].map(lx => {
    const l = group(lx, 0.32, 0);
    within(l, () => {
      cyl(0.06, 0.055, 0.28, jeans, 0, -0.15, 0, { seg: 12 });
      rbox(0.11, 0.06, 0.17, 0.025, mat(C.black, 0.7), 0, -0.29, 0.03);
    });
    return l;
  });
  cyl(0.14, 0.16, 0.32, shirt, 0, 0.47, 0, { seg: 20 });
  cyl(0.158, 0.168, 0.2, mat(o.vest || C.orange, 0.6), 0, 0.5, 0, { seg: 20 });
  cyl(0.161, 0.171, 0.03, mat('#f4f7f9', 0.25, 0.3), 0, 0.47, 0, { seg: 20 });
  sph(0.19, skin, 0, 0.86, 0);
  for (const s of [-1, 1]) {
    sph(0.022, mat(C.black, 0.3), s * 0.065, 0.88, 0.172, { cast: false });
    const ch = sph(0.032, mat('#e08b7a', 0.8), s * 0.11, 0.82, 0.145, { cast: false });
    ch.scale.z = 0.4;
  }
  const hatM = mat(o.hat || C.yellow, 0.35);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), hatM), 0, 0.9, 0);
  cyl(0.235, 0.235, 0.025, hatM, 0, 0.905, 0.02, { seg: 22 });
  box(0.04, 0.03, 0.34, hatM, 0, 1.095, 0);
  const arms = [-1, 1].map(s => {
    const a = group(s * 0.19, 0.6, 0);
    within(a, () => {
      cyl(0.05, 0.045, 0.24, shirt, 0, -0.12, 0, { seg: 10 });
      sph(0.055, skin, 0, -0.27, 0);
    });
    a.rotation.z = s * 0.12;
    return a;
  });
  const hand = new THREE.Group();
  hand.position.y = -0.27;
  arms[1].add(hand);
  cur = prev;
  return { g: w, armL: arms[0], armR: arms[1], legs, hand };
}

/* tools held in the right hand (hand space: the arm runs along -y) */
function hammer(hand) {
  within(hand, () => {
    cyl(0.014, 0.014, 0.26, mat(C.oakDark, 0.7), 0, 0, 0.1, { rx: Math.PI / 2, seg: 8 });
    box(0.06, 0.05, 0.13, mat(C.charcoal, 0.4, 0.6), 0, 0, 0.23);
  });
}
function roller(hand) {
  within(hand, () => {
    cyl(0.012, 0.012, 1.0, mat(C.yellow, 0.5), 0, -0.5, 0, { seg: 8 });
    cyl(0.045, 0.045, 0.26, mat('#ffffff', 0.9), 0, -1.0, 0, { rz: Math.PI / 2, seg: 14 });
  });
}
function drill(hand) {
  within(hand, () => {
    rbox(0.07, 0.16, 0.07, 0.02, mat(C.blue, 0.5), 0, -0.02, 0.04);
    rbox(0.07, 0.07, 0.2, 0.02, mat(C.blue, 0.5), 0, 0.07, 0.1);
    cyl(0.008, 0.008, 0.1, mat(C.steel, 0.3, 0.8), 0, 0.07, 0.24, { rx: Math.PI / 2, seg: 6 });
  });
}

/* walking: legs swing, the body bobs */
function walkCycle(wk, t, speed = 7) {
  wk.legs[0].rotation.x = Math.sin(t * speed) * 0.45;
  wk.legs[1].rotation.x = -Math.sin(t * speed) * 0.45;
}

/* aluminum sliding window: frame + panes facing +z, in the current group.
   Returns the panes so a slider can move.                                */
function windowUnit(w, h, panes, glassMat, o = {}) {
  const frameM = mat(o.frame || C.alu, 0.35, 0.5), d = 0.07, f = 0.05;
  box(w, f, d, frameM, 0, h / 2 - f / 2, 0);
  box(w, f, d, frameM, 0, -h / 2 + f / 2, 0);
  box(f, h, d, frameM, -w / 2 + f / 2, 0, 0);
  box(f, h, d, frameM, w / 2 - f / 2, 0, 0);
  const pw = (w - f * 2) / panes, out = [];
  for (let i = 0; i < panes; i++) {
    const p = new THREE.Group();
    p.position.set(-w / 2 + f + pw * (i + 0.5), 0, i % 2 ? 0.012 : -0.012);
    cur.add(p);
    within(p, () => {
      box(pw, h - f * 2, 0.012, glassMat, 0, 0, 0, { cast: false });
      box(0.03, h - f * 2, 0.03, frameM, -pw / 2 + 0.015, 0, 0);
      box(0.03, h - f * 2, 0.03, frameM, pw / 2 - 0.015, 0, 0);
    });
    out.push(p);
  }
  return out;
}

/* =========================================================================
   The lot (always there)
   ========================================================================= */
part('lot', 'grow');
rbox(13, 0.5, 11, 0.12, mat(C.soil, 0.95), 0, -0.31, 0);
box(7.4, 0.1, 6.6, mat(C.concrete, 0.85), -1.1, -0.05, -1.1);
for (let i = 1; i < 4; i++) box(0.02, 0.004, 6.6, mat(C.joint, 0.9), -4.8 + i * 1.85, 0.002, -1.1, { cast: false });
for (let i = 1; i < 3; i++) box(7.4, 0.004, 0.02, mat(C.joint, 0.9), -1.1, 0.002, -4.4 + i * 2.2, { cast: false });

const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.14 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.57;
ground.receiveShadow = true;
scene.add(ground);

/* ---- hoarding fence with the MRB banner, back and left edges ------------ */
part('fence', 'below');
const fenceTex = canvasTex(2016, 160, drawFence, { text: true });     // 12.6 m at 160 px/m
const fenceTex2 = canvasTex(1680, 160, drawFence, { text: true });    // 10.5 m
const fenceM = new THREE.MeshStandardMaterial({ map: fenceTex, roughness: 0.7 });
const fenceM2 = new THREE.MeshStandardMaterial({ map: fenceTex2, roughness: 0.7 });
box(12.6, 1.0, 0.04, fenceM, 0, 0.5, -5.25);
box(10.5, 1.0, 0.04, fenceM2, -6.25, 0.5, 0, { ry: Math.PI / 2 });
for (let x = -6.25; x <= 6.3; x += 1.575) cyl(0.035, 0.035, 1.2, mat(C.charcoal, 0.5), x, 0.6, -5.2, { seg: 8 });
for (let z = -3.7; z <= 5.3; z += 1.5) cyl(0.035, 0.035, 1.2, mat(C.charcoal, 0.5), -6.2, 0.6, z, { seg: 8 });

/* ---- site office container (about) ------------------------------------- */
part('office', 'above', { hotspot: 'about', label: 'Site office · About MRB' });
within(group(4.4, 0, -3.6), () => {
  for (const x of [-1.1, 1.1]) box(0.3, 0.12, 1.1, mat(C.concrete, 0.9), x, 0.06, 0);
  box(2.8, 1.25, 1.15, mat(C.charcoal, 0.55, 0.2), 0, 0.745, 0);
  const rib = mat('#383d46', 0.5, 0.25);
  for (let x = -1.3; x <= 1.31; x += 0.13) box(0.05, 1.15, 0.03, rib, x, 0.745, 0.585, { cast: false });
  box(2.82, 0.06, 1.17, mat(C.slate, 0.5, 0.2), 0, 1.4, 0);
  // door, window, logo plate
  box(0.5, 0.95, 0.04, mat('#f0f1f3', 0.5), -0.85, 0.62, 0.6);
  sph(0.025, mat(C.steel, 0.3, 0.8), -0.67, 0.62, 0.63);
  box(0.6, 0.42, 0.04, mat(C.alu, 0.35, 0.5), 0.75, 0.9, 0.6);
  box(0.52, 0.34, 0.02, glassBlue, 0.75, 0.9, 0.625, { cast: false });
  const logo = canvasTex(512, 200, drawOfficeLogo, { text: true });
  plane(0.85, 0.33, new THREE.MeshStandardMaterial({ map: logo, roughness: 0.5 }), 0.0, 0.98, 0.625);
  box(0.9, 0.06, 0.012, glow(C.blue), 0.0, 0.76, 0.62, { cast: false });
  // steps and an air-con unit
  box(0.55, 0.12, 0.35, mat(C.concrete, 0.9), -0.85, 0.06, 0.78);
  box(0.4, 0.3, 0.2, mat('#eceef1', 0.6), 1.45, 1.05, 0.0, { ry: Math.PI / 2 });
});

/* ---- project signboard (contact) --------------------------------------- */
part('signboard', 'above', { hotspot: 'contact', label: 'Get a free quote' });
within(group(4.8, 0, 3.4, { ry: 0.3 }), () => {
  for (const x of [-0.85, 0.85]) cyl(0.045, 0.05, 2.1, mat(C.charcoal, 0.4, 0.5), x, 1.05, -0.04, { seg: 10 });
  box(2.0, 1.2, 0.06, mat(C.charcoal, 0.5), 0, 1.45, 0);
  const signTex = canvasTex(1000, 600, drawSign, { text: true });
  plane(1.94, 1.14, new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.55 }), 0, 1.45, 0.032);
});

/* ---- tower crane: its hook sign names the scene; tap it for the service --
   The mast stands behind the building; the jib swings out so the sign
   hangs just above the building's front corner.                         */
const MAST = V(2.4, 0, -4.7), JIB_Y = 5.0;
const HOOK = V(1.5, 0, 1.1), SIGN_Y = 3.55, SIGN_W = 1.4, SIGN_H = 0.7;
const reach = Math.hypot(HOOK.x - MAST.x, HOOK.z - MAST.z);
const HOOK_TOP = SIGN_Y + SIGN_H / 2 + 0.4;

part('crane', 'below');
const craneY = mat(C.yellow, 0.5, 0.2), craneD = mat('#c99400', 0.5, 0.2);
within(group(MAST.x, 0, MAST.z), () => {
  box(0.9, 0.3, 0.9, mat(C.concrete, 0.9), 0, 0.15, 0);
  const s = 0.16, step = 0.45, H = JIB_Y - 0.3;
  for (const [x, z] of [[-s, -s], [s, -s], [-s, s], [s, s]]) box(0.05, H, 0.05, craneY, x, 0.3 + H / 2, z);
  for (let y = 0.6; y < JIB_Y; y += step) {
    for (const z of [-s, s]) box(2 * s, 0.03, 0.03, craneD, 0, y, z, { cast: false });
    for (const x of [-s, s]) box(0.03, 0.03, 2 * s, craneD, x, y, 0, { cast: false });
  }
  for (let y = 0.6; y + step < JIB_Y; y += step) {
    rod(V(-s, y, s), V(s, y + step, s), 0.012, craneD);
    rod(V(s, y, -s), V(s, y + step, s), 0.012, craneD);
  }
  const jib = group(0, JIB_Y, 0, { ry: Math.atan2(-(HOOK.z - MAST.z), HOOK.x - MAST.x) });
  within(jib, () => {
    const L = reach + 0.7, B = 2.2, top = 0.32;
    for (const z of [-0.13, 0.13]) box(L + B, 0.045, 0.045, craneY, (L - B) / 2, 0, z);
    box(L + 0.2, 0.045, 0.045, craneY, L / 2 - 0.1, top, 0);
    for (let x = 0; x + 0.35 <= L; x += 0.35) {
      rod(V(x, 0, 0.13), V(x + 0.175, top, 0), 0.011, craneD);
      rod(V(x + 0.175, top, 0), V(x + 0.35, 0, 0.13), 0.011, craneD);
      box(0.03, 0.03, 0.26, craneD, x, 0, 0, { cast: false });
    }
    for (let x = -B; x < 0; x += 0.4) box(0.03, 0.03, 0.26, craneD, x, 0, 0, { cast: false });
    // peak and tie bars
    box(0.06, 0.8, 0.06, craneY, 0, 0.4, 0);
    rod(V(0, 0.8, 0), V(L * 0.7, top, 0), 0.014, mat(C.charcoal, 0.5, 0.5));
    rod(V(0, 0.8, 0), V(-B + 0.2, 0.05, 0), 0.014, mat(C.charcoal, 0.5, 0.5));
    // counterweights and cab
    for (let i = 0; i < 3; i++) box(0.22, 0.5, 0.42, mat(C.concrete, 0.9), -B + 0.25 + i * 0.24, -0.22, 0);
    rbox(0.55, 0.48, 0.45, 0.05, mat('#f2f2ee', 0.5), 0.45, -0.32, 0.36);
    box(0.4, 0.26, 0.02, glassBlue, 0.45, -0.28, 0.59, { cast: false });
    // the MRB plate on the jib
    box(1.3, 0.24, 0.02, mat(C.charcoal, 0.5), 1.6, 0.16, 0.15);
    // trolley and the cable down to the hook
    box(0.32, 0.08, 0.34, mat(C.charcoal, 0.5, 0.4), reach, -0.06, 0);
    cyl(0.008, 0.008, JIB_Y - HOOK_TOP - 0.1, mat(C.black, 0.4), reach, -(JIB_Y - HOOK_TOP) / 2 - 0.05, 0, { seg: 4, cast: false });
  });
});

const nextSign = part('scene-sign', 'above', { hotspot: 'next', label: 'Next scene' });
const hook = group(HOOK.x, HOOK_TOP, HOOK.z);
const nextTex = canvasTex(560, 280, drawNow, { text: true });
within(hook, () => {
  rbox(0.16, 0.18, 0.12, 0.03, mat(C.charcoal, 0.4, 0.5), 0, 0.02, 0);
  add(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.014, 6, 16, Math.PI * 1.4), mat(C.steel, 0.3, 0.8)), 0, -0.1, 0, { rz: -Math.PI * 0.2 });
  // turned to face the starting camera
  const face = group(0, -0.4 - SIGN_H / 2, 0, { ry: 0.3 });
  within(face, () => {
    for (const x of [-0.6, 0.6]) rod(V(0, 0.38, 0), V(x, SIGN_H / 2, 0), 0.008, mat(C.black, 0.4));
    rbox(SIGN_W, SIGN_H, 0.07, 0.03, mat(C.charcoal, 0.5), 0, 0, 0);
    const faceM = new THREE.MeshBasicMaterial({ map: nextTex, toneMapped: false });
    plane(SIGN_W - 0.08, SIGN_H - 0.08, faceM, 0, 0, 0.037);
    plane(SIGN_W - 0.08, SIGN_H - 0.08, faceM, 0, 0, -0.037, { ry: Math.PI });
  });
});
// a still, slightly larger invisible target, so the swinging sign is easy to hit
cur = nextSign;
box(SIGN_W + 0.6, SIGN_H + 0.8, 0.3, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
  HOOK.x, SIGN_Y + 0.3, HOOK.z, { ry: 0.3, cast: false });
let swing = 0;
function refreshNext() {
  nextTex.redraw();
  const cur = SCENES.find(s => s.key === MRB.scenario) || SCENES[0];
  nextSign.userData.label = cur.title + ' — view service';
  if (hovered === nextSign) tip.textContent = nextSign.userData.label;
}
window.addEventListener('mrb:scenario', () => { refreshNext(); swing = 1; });
tick((t, dt) => {
  swing = Math.max(0, swing - dt * 0.6);
  hook.rotation.z = Math.sin(t * 1.7) * (0.015 + swing * 0.08);
  hook.rotation.x = Math.sin(t * 1.15) * (0.008 + swing * 0.03);
});

/* ---- cones, a barrier, blocks and sand on the free corners ------------- */
part('props', 'above');
const coneM = mat(C.orange, 0.55), bandM = mat('#ffffff', 0.4);
for (const [x, z] of [[-4.4, 3.4], [-2.6, 3.4], [-0.8, 3.4], [1.6, 3.2]]) {
  box(0.36, 0.04, 0.36, mat(C.charcoal, 0.7), x, 0.02, z);
  cyl(0.03, 0.15, 0.5, coneM, x, 0.29, z, { seg: 16 });
  cyl(0.083, 0.11, 0.08, bandM, x, 0.33, z, { seg: 16 });
}
for (const [a, b] of [[-4.4, -2.6], [-2.6, -0.8]]) {
  const m = (a + b) / 2;
  box(Math.abs(b - a) - 0.2, 0.08, 0.03, mat(C.yellow, 0.5), m, 0.42, 3.4);
}
// hollow blocks on a pallet
within(group(-5.5, 0, 1.2), () => {
  box(1.0, 0.1, 0.8, mat(C.oak, 0.85), 0, 0.05, 0);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++)
    box(0.42, 0.18, 0.34, mat('#a9a69f', 0.95), -0.23 + i * 0.46, 0.19 + r * 0.19, -0.18 + j * 0.37);
});
// sand pile
add(new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.6, 24), mat('#d9c49b', 1)), -5.4, 0.3, -2.6);
add(new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.42, 20), mat('#cfba90', 1)), -5.0, 0.21, -1.6);

/* =========================================================================
   Shared: an interior room shell for the ceiling and cabinet scenes
   floor x -4..1.8, z -4..1.2 (top at y 0.08); walls on the back and left
   ========================================================================= */
const RX0 = -4, RX1 = 1.8, RZ0 = -4, RZ1 = 1.2, FY = 0.08, WH = 2.9;
function roomShell(floorMat) {
  part('floor', 'grow');
  box(RX1 - RX0, FY, RZ1 - RZ0, floorMat, (RX0 + RX1) / 2, FY / 2, (RZ0 + RZ1) / 2);
  part('walls', 'below');
  const wallM = mat('#f2f1ed', 0.92);
  box(RX1 - RX0 + 0.15, WH, 0.15, wallM, (RX0 + RX1 - 0.15) / 2, FY + WH / 2, RZ0 - 0.075);
  box(0.15, WH, RZ1 - RZ0 + 0.15, wallM, RX0 - 0.075, FY + WH / 2, (RZ0 + RZ1 - 0.15) / 2);
  const skirt = mat('#d9d6cf', 0.6);
  box(RX1 - RX0, 0.1, 0.02, skirt, (RX0 + RX1) / 2, FY + 0.05, RZ0 + 0.01);
  box(0.02, 0.1, RZ1 - RZ0, skirt, RX0 + 0.01, FY + 0.05, (RZ0 + RZ1) / 2);
}

/* =========================================================================
   Scene 1 — Ceilings & Lighting
   ========================================================================= */
scenario('ceiling', () => {
  const tiles = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#e9e5dd'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#cdc7bc'; x.lineWidth = 3; x.strokeRect(0, 0, w, h);
  }, { repeat: [9.6, 8.6] });
  roomShell(new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.35 }));

  const SOFFIT_Y = 2.62, TOP = FY + WH;
  const hot = { hotspot: 'ceiling', label: sceneTitle.ceiling };

  // L-shaped dropped soffit along the walls, with a blue cove light on its edge
  part('soffit', 'above', hot);
  const gyp = mat('#fbfbf9', 0.9);
  const sd = 0.9, st = TOP - SOFFIT_Y;
  box(RX1 - RX0, st, sd, gyp, (RX0 + RX1) / 2, SOFFIT_Y + st / 2, RZ0 + sd / 2);
  box(sd, st, RZ1 - RZ0 - sd, gyp, RX0 + sd / 2, SOFFIT_Y + st / 2, (RZ0 + sd + RZ1) / 2);
  const ledM = glow(C.led);
  box(RX1 - RX0 - sd, 0.025, 0.025, ledM, (RX0 + sd + RX1) / 2, SOFFIT_Y - 0.012, RZ0 + sd + 0.01, { cast: false });
  box(0.025, 0.025, RZ1 - RZ0 - sd, ledM, RX0 + sd + 0.01, SOFFIT_Y - 0.012, (RZ0 + sd + RZ1) / 2, { cast: false });
  // the cove lights up the soffit's face, brightest at the bottom edge
  const wash = glowMat(downTex, C.blue, 0.7);
  plane(RX1 - RX0 - sd, st, wash, (RX0 + sd + RX1) / 2, SOFFIT_Y + st / 2, RZ0 + sd + 0.004, { rz: Math.PI });
  plane(RZ1 - RZ0 - sd, st, wash, RX0 + sd + 0.004, SOFFIT_Y + st / 2, (RZ0 + sd + RZ1) / 2, { ry: Math.PI / 2, rz: Math.PI });
  // warm downlights in the soffit, with painted beams on the walls
  const beam = glowMat(downTex, '#ffcf93', 0.5);
  for (let x = -3.1; x < 1.6; x += 1.15) {
    cyl(0.05, 0.05, 0.01, glow('#fff3dd'), x, SOFFIT_Y - 0.004, RZ0 + 0.45, { cast: false, seg: 16 });
    plane(0.55, 1.5, beam, x, SOFFIT_Y - 0.75, RZ0 + 0.005);
  }
  for (let z = -2.6; z < 1.0; z += 1.2) plane(0.55, 1.5, beam, RX0 + 0.005, SOFFIT_Y - 0.75, z, { ry: Math.PI / 2 });

  // the feature: a floating ring ceiling with a glowing halo, like MRB's photos
  part('halo', 'above', hot);
  const HX = -0.9, HZ = -0.9;
  const ring = new THREE.Shape();
  ring.absarc(0, 0, 1.35, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.98, 0, Math.PI * 2, true);
  ring.holes.push(hole);
  const ringGeo = new THREE.ExtrudeGeometry(ring, { depth: 0.1, bevelEnabled: false, curveSegments: 64 });
  ringGeo.rotateX(-Math.PI / 2);
  add(new THREE.Mesh(ringGeo, gyp), HX, 2.72, HZ);
  cyl(0.86, 0.86, 0.09, gyp, HX, 2.55, HZ, { seg: 64 });
  const haloM = glow(C.led);
  const haloIn = add(new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.045, 10, 96), haloM), HX, 2.66, HZ, { rx: Math.PI / 2, cast: false });
  add(new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.03, 10, 96), haloM), HX, 2.82, HZ, { rx: Math.PI / 2, cast: false });
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    cyl(0.03, 0.03, 0.01, glow('#fff3dd'), HX + Math.cos(a) * 0.55, 2.5, HZ + Math.sin(a) * 0.55, { cast: false, seg: 12 });
  }
  for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]])
    cyl(0.006, 0.006, TOP - 2.82, mat(C.steel, 0.4, 0.7), HX + dx * 0.8, (TOP + 2.82) / 2, HZ + dz * 0.8, { seg: 4, cast: false });
  const pool = plane(4.2, 4.2, glowMat(radialTex, C.blue, 0.35), HX, FY + 0.006, HZ, { rx: -Math.PI / 2 });
  const haloGlow = plane(3.6, 3.6, glowMat(radialTex, C.led, 0.55), HX, 2.84, HZ, { rx: -Math.PI / 2 });
  const haloLight = new THREE.PointLight(0x4fb3ff, 3, 4.5, 2);
  haloLight.position.set(HX, 2.3, HZ);
  cur.add(haloLight);
  tick(t => {
    const k = 0.85 + Math.sin(t * 1.6) * 0.15;
    pool.material.opacity = 0.35 * k;
    haloGlow.material.opacity = 0.55 * k;
    haloLight.intensity = 3 * k;
    haloIn.scale.setScalar(1 + Math.sin(t * 1.6) * 0.004);
  });

  // unfinished part: the metal furring grid, still waiting for its boards
  part('grid', 'above');
  const steel = mat(C.steel, 0.4, 0.6);
  const gx0 = 0.6, gz0 = RZ0 + sd;
  for (let z = gz0 + 0.3; z < RZ1; z += 0.6) box(RX1 - gx0, 0.02, 0.025, steel, (gx0 + RX1) / 2, TOP - 0.03, z, { cast: false });
  for (const x of [gx0 + 0.02, gx0 + 0.6, RX1 - 0.02]) box(0.03, 0.04, RZ1 - gz0, steel, x, TOP - 0.05, (gz0 + RZ1) / 2, { cast: false });
  // a few boards already up at the back of the strip
  box(RX1 - gx0, 0.012, 1.2, gyp, (gx0 + RX1) / 2, TOP - 0.065, gz0 + 0.6);

  // installer on an A-frame ladder lifting a gypsum board into the grid
  part('installer', 'above');
  within(group(0.7, FY, 0.3, { ry: -0.5 }), () => {
    const lad = mat(C.blue, 0.5, 0.3);
    for (const s of [-1, 1]) for (const zz of [-1, 1])
      box(0.04, 1.3, 0.04, lad, s * 0.25, 0.64, zz * 0.22, { rx: zz * -0.18 });
    for (let i = 1; i < 4; i++) box(0.5, 0.03, 0.12, lad, 0, i * 0.3, 0.22 - i * 0.05);
    box(0.55, 0.05, 0.3, lad, 0, 1.27, 0);
    const wk = worker(0, 1.3, 0.05, { hat: '#ffffff', vest: C.blue });
    wk.armL.rotation.x = wk.armR.rotation.x = -2.9;
    const board = group(0, 2.62, 0.25);
    within(board, () => box(1.2, 0.012, 0.6, gyp, 0, 0, 0));
    tick(t => {
      const lift = Math.max(0, Math.sin(t * 0.9));
      board.position.y = 2.28 + lift * 0.22;
      wk.armL.rotation.x = wk.armR.rotation.x = -2.75 - lift * 0.25;
      wk.g.position.y = 1.3 + lift * 0.04;
    });
  });

  // a stack of boards and the second crew member carrying a downlight
  part('boards', 'above');
  for (let i = 0; i < 5; i++) box(1.2, 0.012, 0.6, gyp, -2.4, FY + 0.06 + i * 0.014, 0.4, { ry: 0.05 * i });
  box(0.3, 0.06, 0.6, mat(C.oakDark, 0.8), -2.4, FY + 0.03, 0.4, { ry: Math.PI / 2 });
  const helper = worker(-1.6, FY, 0.6, { ry: 0.3 });
  helper.armR.rotation.x = -1.0;
  helper.armL.rotation.x = -1.0;
  within(helper.hand, () => cyl(0.06, 0.06, 0.04, mat('#ffffff', 0.4), 0, -0.02, 0.06, { seg: 16 }));
  tick(t => {
    const s = Math.sin(t * 0.7);
    helper.g.position.x = -1.6 + s * 0.6;
    helper.g.rotation.y = Math.cos(t * 0.7) > 0 ? Math.PI / 2 : -Math.PI / 2;
    walkCycle(helper, t);
  });
});

/* =========================================================================
   Scene 2 — Cabinetry
   ========================================================================= */
scenario('cabinets', () => {
  const planks = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#cfa77a'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      x.fillStyle = i % 2 ? '#c99f71' : '#d4ad82';
      x.fillRect(0, i * 64 + 1, w, 62);
      x.fillStyle = '#b48a5e';
      const off = (i * 197) % w;
      x.fillRect(off, i * 64, 2, 64);
    }
  }, { repeat: [3, 3] });
  roomShell(new THREE.MeshStandardMaterial({ map: planks, roughness: 0.5 }));

  const grain = canvasTex(256, 512, (x, w, h) => {
    x.fillStyle = C.oak; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      x.strokeStyle = `rgba(${90 + (i * 37) % 40}, ${55 + (i * 13) % 25}, 30, ${0.12 + (i % 5) * 0.03})`;
      x.lineWidth = 1 + (i % 3);
      const px = (i * 53) % w;
      x.beginPath(); x.moveTo(px, 0);
      x.bezierCurveTo(px + 8, h * 0.3, px - 8, h * 0.7, px + 4, h);
      x.stroke();
    }
  });
  const oak = new THREE.MeshStandardMaterial({ map: grain, roughness: 0.55 });
  const white = mat('#f6f5f2', 0.3), handleM = mat(C.charcoal, 0.3, 0.7);
  const hot = { hotspot: 'cabinets', label: sceneTitle.cabinets };

  // base run, counter, backsplash and wall cabinets along the back wall
  part('kitchen', 'above', hot);
  const KX0 = -3.4, KX1 = 0.9, KD = 0.6, BH = 0.82, z0 = RZ0;
  box(KX1 - KX0, 0.1, KD - 0.06, mat(C.charcoal, 0.8), (KX0 + KX1) / 2, FY + 0.05, z0 + (KD - 0.06) / 2);
  const doors = Math.round((KX1 - KX0) / 0.54), dw = (KX1 - KX0) / doors;
  for (let i = 0; i < doors; i++) {
    const cx = KX0 + dw * (i + 0.5);
    rbox(dw - 0.012, BH - 0.1, KD, 0.008, oak, cx, FY + 0.1 + (BH - 0.1) / 2, z0 + KD / 2);
    box(0.24, 0.018, 0.02, handleM, cx, FY + BH - 0.07, z0 + KD + 0.01);
  }
  box(KX1 - KX0 + 0.04, 0.05, KD + 0.04, white, (KX0 + KX1) / 2, FY + BH + 0.025, z0 + (KD + 0.04) / 2);
  box(KX1 - KX0, 0.6, 0.02, mat('#eceae5', 0.25), (KX0 + KX1) / 2, FY + BH + 0.35, z0 + 0.01);
  // sink and faucet, cooktop and hood
  box(0.55, 0.012, 0.38, mat(C.steel, 0.25, 0.8), -0.4, FY + BH + 0.052, z0 + 0.32, { cast: false });
  cyl(0.015, 0.015, 0.3, mat(C.steel, 0.2, 0.9), -0.4, FY + BH + 0.2, z0 + 0.12, { seg: 8 });
  box(0.03, 0.03, 0.18, mat(C.steel, 0.2, 0.9), -0.4, FY + BH + 0.35, z0 + 0.2);
  box(0.6, 0.012, 0.45, mat(C.black, 0.2), -2.3, FY + BH + 0.052, z0 + 0.3, { cast: false });
  for (const [dx, dz] of [[-0.14, 0.1], [0.14, 0.1], [-0.14, -0.1], [0.14, -0.1]])
    add(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.006, 6, 24), mat('#555', 0.5)), -2.3 + dx, FY + BH + 0.06, z0 + 0.3 + dz, { rx: Math.PI / 2, cast: false });
  box(0.7, 0.35, 0.45, mat(C.steel, 0.3, 0.8), -2.3, FY + 1.85, z0 + 0.225);
  // wall cabinets with an LED strip under them, and open oak shelves
  const UY0 = FY + 1.55, UY1 = FY + 2.3, UD = 0.35;
  for (let i = 0; i < 6; i++) {
    const cx = -3.4 + 0.45 * (i + 0.5);
    if (Math.abs(cx + 2.3) < 0.4) continue;
    rbox(0.44, UY1 - UY0, UD, 0.008, oak, cx, (UY0 + UY1) / 2, z0 + UD / 2);
    box(0.016, 0.16, 0.02, handleM, cx + (i % 2 ? -0.17 : 0.17), UY0 + 0.12, z0 + UD + 0.01);
  }
  box(2.7, 0.015, 0.02, glow('#ffe1b0'), -2.05, UY0 - 0.012, z0 + UD - 0.04, { cast: false });
  plane(2.7, 0.62, glowMat(downTex, '#ffcf93', 0.55), -2.05, UY0 - 0.32, z0 + 0.025);
  for (const y of [UY0 + 0.05, UY0 + 0.45]) {
    box(1.1, 0.04, 0.3, oak, 0.3, y, z0 + 0.15);
    for (let i = 0; i < 4; i++) cyl(0.05, 0.05, 0.14 + (i % 2) * 0.06, mat(['#e9e2d6', '#3b414b', '#c8b08a', '#ffffff'][i], 0.5), -0.05 + i * 0.24, y + 0.1 + (i % 2) * 0.03, z0 + 0.15, { seg: 14 });
  }

  // tall pantry units on the left wall; one door swings open and shut
  part('pantry', 'above', hot);
  const PX = RX0, PD = 0.6, PH = 2.35, PZ0 = -3.3, unit = 0.75;
  let swing = null;
  for (let i = 0; i < 3; i++) {
    const cz = PZ0 + unit * (i + 0.5);
    box(PD, PH, unit, oak, PX + PD / 2, FY + PH / 2, cz);
    if (i === 1) {
      // hollow it out visually: a dark interior with shelves
      box(0.02, PH - 0.1, unit - 0.06, mat('#5a3f29', 0.8), PX + PD + 0.005, FY + PH / 2, cz, { cast: false });
      for (let s = 0; s < 4; s++) box(0.04, 0.02, unit - 0.08, white, PX + PD + 0.02, FY + 0.4 + s * 0.5, cz, { cast: false });
      swing = group(PX + PD + 0.02, FY + PH / 2, cz + unit / 2 - 0.01);
      within(swing, () => {
        box(0.025, PH - 0.04, unit - 0.02, oak, 0, 0, -(unit - 0.02) / 2);
        box(0.02, 0.5, 0.016, handleM, 0.025, 0, -(unit - 0.08));
      });
    } else {
      box(0.02, 0.5, 0.016, handleM, PX + PD + 0.012, FY + 1.1, cz + unit / 2 - 0.08);
    }
  }
  tick(t => { if (swing) swing.rotation.y = -Math.max(0, Math.sin(t * 0.6)) * 1.25; });

  // island with a white top and three stools, under pendant lights
  part('island', 'above', hot);
  const IX = -1.4, IZ = -1.4;
  box(2.0, 0.86, 0.85, mat(C.charcoal, 0.6), IX, FY + 0.43, IZ);
  box(2.2, 0.05, 1.0, white, IX, FY + 0.885, IZ + 0.05);
  for (let i = 0; i < 3; i++) {
    const sx = IX - 0.65 + i * 0.65, sz = IZ + 0.85;
    cyl(0.18, 0.18, 0.05, oak, sx, FY + 0.68, sz, { seg: 20 });
    for (const [dx, dz] of [[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]])
      cyl(0.012, 0.012, 0.66, mat(C.black, 0.4, 0.5), sx + dx, FY + 0.33, sz + dz, { seg: 6 });
  }
  for (let i = 0; i < 3; i++) {
    const px = IX - 0.6 + i * 0.6;
    cyl(0.004, 0.004, 0.9, mat(C.black, 0.4), px, FY + 2.45, IZ, { seg: 4, cast: false });
    add(new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.16, 20, 1, true), new THREE.MeshStandardMaterial({ color: C.charcoal, roughness: 0.4, side: THREE.DoubleSide })), px, FY + 1.95, IZ);
    sph(0.045, glow('#fff1d6'), px, FY + 1.88, IZ, { cast: false });
  }
  plane(2.6, 1.4, glowMat(radialTex, '#ffd9a0', 0.35), IX, FY + 0.915, IZ + 0.05, { rx: -Math.PI / 2 });

  // a handcrafted rattan armchair in the corner
  part('rattan', 'above', { hotspot: 'services', label: 'Handcrafted rattan furniture' });
  const weave = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#b98a4e'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#e2bf86'; x.lineWidth = 5;
    for (let i = -w; i < w * 2; i += 18) {
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i + h, h); x.stroke();
      x.beginPath(); x.moveTo(i, h); x.lineTo(i + h, 0); x.stroke();
    }
  }, { repeat: [3, 2] });
  const rattanM = new THREE.MeshStandardMaterial({ map: weave, roughness: 0.8, side: THREE.DoubleSide });
  within(group(0.95, FY, 0.35, { ry: -0.9 }), () => {
    cyl(0.36, 0.3, 0.32, rattanM, 0, 0.16, 0, { seg: 28 });
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.55, 28, 1, true, Math.PI * 0.6, Math.PI * 1.8), rattanM), 0, 0.6, -0.02);
    add(new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.035, 8, 40, Math.PI * 1.8), mat(C.rattan, 0.7)), 0, 0.88, -0.02, { rx: Math.PI / 2, rz: Math.PI * 0.6 + Math.PI });
    cyl(0.33, 0.33, 0.08, mat('#f1ece2', 0.95), 0, 0.36, 0, { seg: 28 });
  });

  // carpenter drilling a wall cabinet, another one with a level at the island
  part('crew', 'above');
  const carp = worker(-1.15, FY + 0.18, -3.05, { ry: Math.PI, vest: C.orange });
  box(0.5, 0.18, 0.35, mat(C.charcoal, 0.6), -1.15, FY + 0.09, -3.05);
  drill(carp.hand);
  carp.armR.rotation.x = -2.5;
  carp.armL.rotation.x = -2.2;
  const fitter = worker(0.45, FY, -1.0, { ry: -1.2, hat: '#ffffff', vest: C.yellow });
  fitter.armR.rotation.x = fitter.armL.rotation.x = -1.3;
  within(fitter.hand, () => box(0.5, 0.05, 0.05, mat(C.yellow, 0.4), -0.15, 0, 0.05));
  tick(t => {
    carp.hand.rotation.z = Math.sin(t * 40) * 0.03 * (Math.sin(t * 1.3) > 0 ? 1 : 0);
    carp.armR.rotation.x = -2.5 + Math.sin(t * 1.3) * 0.05;
    fitter.g.rotation.y = -1.2 + Math.sin(t * 0.8) * 0.25;
  });
});

/* =========================================================================
   Scene 3 — Glass & Aluminum
   A two-storey white house: blue reflective sliding windows, a balcony
   with a black steel railing — like the flyer — and a glass A-frame rack.
   ========================================================================= */
const HX0 = -3.6, HX1 = 1.4, HZ0 = -3.2, HZ1 = 0.4;
const HCX = (HX0 + HX1) / 2, HCZ = (HZ0 + HZ1) / 2, HW = HX1 - HX0, HD = HZ1 - HZ0;

scenario('glass', () => {
  const hot = { hotspot: 'glass', label: sceneTitle.glass };
  part('house', 'below');
  const wallM = mat('#f4f4f1', 0.85);
  box(HW + 0.2, 0.12, HD + 0.2, mat(C.concrete, 0.9), HCX, 0.06, HCZ);
  box(HW, 3.0, HD, wallM, HCX, 0.12 + 1.5, HCZ);
  box(HW + 0.08, 0.1, HD + 0.08, mat(C.trim, 0.7), HCX, 1.62, HCZ);
  box(HW + 0.5, 0.14, HD + 0.5, mat(C.slate, 0.7), HCX, 3.19, HCZ);
  box(HW + 0.5, 0.025, 0.06, glow(C.blue), HCX, 3.12, HZ1 + 0.25, { cast: false });
  // downspout, like the photo
  cyl(0.04, 0.04, 3.05, mat('#c95b4a', 0.5), HX1 + 0.08, 1.6, HZ1 + 0.05, { seg: 10 });

  part('facade', 'above', hot);
  let slider = null;
  // ground floor front: a big sliding door and a window
  within(group(-1.9, 0.12 + 1.0, HZ1 + 0.04), () => { slider = windowUnit(1.8, 2.0, 2, glassBlue)[1]; });
  within(group(0.35, 0.12 + 1.05, HZ1 + 0.04), () => windowUnit(1.2, 0.9, 2, glassBlue));
  // upper floor front: the three-panel window behind the balcony
  within(group(-1.4, 1.72 + 0.65, HZ1 + 0.04), () => windowUnit(3.4, 1.15, 3, glassBlue));
  // right side
  within(group(HX1 + 0.04, 0.12 + 1.05, -0.5, { ry: Math.PI / 2 }), () => windowUnit(1.2, 0.9, 2, glassBlue));
  within(group(HX1 + 0.04, 0.12 + 1.05, -2.3, { ry: Math.PI / 2 }), () => windowUnit(1.2, 0.9, 2, glassBlue));
  within(group(HX1 + 0.04, 1.72 + 0.65, -1.4, { ry: Math.PI / 2 }), () => windowUnit(2.4, 1.0, 3, glassBlue));
  const base = slider.position.x;
  tick(t => {
    const k = Math.min(1, Math.max(0, Math.sin(t * 0.5) * 1.4 + 0.2));
    slider.position.x = base - k * 0.82;
  });

  // balcony slab and black steel railing
  part('balcony', 'above', hot);
  const BX0 = -3.3, BX1 = 0.5, BD = 0.7, BY = 1.67;
  box(BX1 - BX0, 0.1, BD, mat(C.trim, 0.7), (BX0 + BX1) / 2, BY, HZ1 + BD / 2);
  const rail = mat('#202226', 0.45, 0.6);
  const RH = 0.6, RT = BY + 0.05 + RH;
  box(BX1 - BX0, 0.04, 0.04, rail, (BX0 + BX1) / 2, RT, HZ1 + BD - 0.02);
  for (const x of [BX0 + 0.02, BX1 - 0.02]) box(0.04, 0.04, BD, rail, x, RT, HZ1 + BD / 2);
  for (let x = BX0 + 0.02; x <= BX1; x += 0.13) box(0.022, RH, 0.022, rail, x, RT - RH / 2, HZ1 + BD - 0.02);
  for (let z = HZ1 + 0.1; z < HZ1 + BD; z += 0.13) for (const x of [BX0 + 0.02, BX1 - 0.02]) box(0.022, RH, 0.022, rail, x, RT - RH / 2, z);

  // A-frame glass rack
  part('rack', 'above', { hotspot: 'glass', label: 'Blue reflective tempered glass' });
  within(group(3.0, 0, -1.5), () => {
    const frameM = mat(C.charcoal, 0.5, 0.5);
    box(0.9, 0.08, 1.8, frameM, 0, 0.04, 0);
    for (const z of [-0.8, 0.8]) for (const s of [-1, 1]) box(0.05, 1.3, 0.05, frameM, s * 0.17, 0.68, z, { rz: s * 0.25 });
    box(0.05, 0.05, 1.8, frameM, 0, 1.32, 0);
    for (let i = 0; i < 3; i++) for (const s of [-1, 1])
      box(0.012, 1.15, 1.5, glassBlue, s * (0.22 + i * 0.03), 0.66, 0, { rz: s * 0.18, cast: false });
  });

  // two installers carrying a pane between the rack and the house
  part('carriers', 'above');
  const crew = group(2.4, 0, 1.0);
  const pane = new THREE.Group();
  crew.add(pane);
  within(pane, () => box(0.012, 0.95, 1.0, glassBlue, 0, 0.75, 0, { cast: false }));
  let a, b;
  within(crew, () => {
    a = worker(0, 0, -0.75, { vest: C.blue });
    b = worker(0, 0, 0.75, { ry: Math.PI, vest: C.blue, hat: '#ffffff' });
  });
  for (const wk of [a, b]) { wk.armL.rotation.x = wk.armR.rotation.x = -1.2; }
  tick(t => {
    const s = Math.sin(t * 0.45);
    crew.position.z = 1.0 + s * 0.6;
    walkCycle(a, t);
    walkCycle(b, t + 0.4);
    crew.position.y = Math.abs(Math.sin(t * 7)) * 0.02;
  });
});

/* =========================================================================
   Scene 4 — Roofing, Painting & Finishing
   A bungalow: clay tiles going on row by row over the battens, and a
   painter rolling white over the bare plaster.
   ========================================================================= */
scenario('roofing', () => {
  const hot = { hotspot: 'roofing', label: sceneTitle.roofing };
  const WALL_H = 2.3, RISE = 1.1, OVER = 0.35;
  const ridgeY = 0.12 + WALL_H + RISE;
  const half = HD / 2, theta = Math.atan2(RISE, half);
  const slopeL = (half + OVER) / Math.cos(theta);
  const roofW = HW + OVER * 2;

  part('bungalow', 'below');
  box(HW + 0.2, 0.12, HD + 0.2, mat(C.concrete, 0.9), HCX, 0.06, HCZ);
  box(HW, WALL_H, HD, mat(C.plaster, 0.95), HCX, 0.12 + WALL_H / 2, HCZ);
  // gable triangles
  const gable = new THREE.Shape();
  gable.moveTo(-half, 0); gable.lineTo(half, 0); gable.lineTo(0, RISE); gable.closePath();
  const gGeo = new THREE.ExtrudeGeometry(gable, { depth: 0.12, bevelEnabled: false });
  for (const x of [HX0, HX1 - 0.12]) add(new THREE.Mesh(gGeo, mat('#f4f3ef', 0.9)), x, 0.12 + WALL_H, HCZ, { ry: Math.PI / 2 });
  // the right wall is already painted
  box(0.01, WALL_H, HD, mat('#f4f3ef', 0.9), HX1 + 0.005, 0.12 + WALL_H / 2, HCZ, { cast: false });

  // painting the front wall: a white coat that grows to the right
  const PAINT_MAX = HW - 0.05;
  const coat = plane(1, WALL_H - 0.02, mat('#f4f3ef', 0.9), HX0, 0.12 + WALL_H / 2, HZ1 + 0.006);
  coat.geometry.translate(0.5, 0, 0);
  within(group(-2.4, 0.12 + 1.15, HZ1 + 0.04), () => windowUnit(1.1, 0.9, 2, glassClear, { frame: '#ffffff' }));
  within(group(0.3, 0.12 + 1.15, HZ1 + 0.04), () => windowUnit(1.1, 0.9, 2, glassClear, { frame: '#ffffff' }));
  box(0.85, 1.9, 0.06, mat(C.oakDark, 0.6), -0.95, 0.12 + 0.95, HZ1 + 0.03);
  box(0.03, 0.03, 0.1, mat(C.steel, 0.3, 0.8), -0.65, 0.12 + 0.95, HZ1 + 0.08);

  part('painter', 'above');
  const painter = worker(HX0 + 1.2, 0, HZ1 + 0.75, { ry: Math.PI, hat: '#ffffff', shirt: '#dfe7ef' });
  roller(painter.hand);
  painter.armL.rotation.z = 0.5;
  cyl(0.12, 0.1, 0.2, mat('#ffffff', 0.5), HX0 + 0.9, 0.1, HZ1 + 0.95, { seg: 16 });
  let paintClock = 0;
  tick((t, dt) => {
    paintClock += dt;
    const width = Math.min(PAINT_MAX, 1.0 + paintClock * 0.04);
    coat.scale.x = width;
    painter.g.position.x = HX0 + width + 0.15;
    painter.armR.rotation.x = -2.55 + Math.sin(t * 2.2) * 0.3;
    painter.armL.rotation.x = -1.0;
  });

  // roof: rafters + battens everywhere, tiles laid from the eaves up
  part('roof', 'above', hot);
  const roof = group(HCX, ridgeY, HCZ);
  const rafterM = mat(C.oakDark, 0.8), battenM = mat(C.oak, 0.8);
  const tileGeo = new THREE.CylinderGeometry(0.115, 0.13, 0.34, 10, 1, true, -Math.PI / 2, Math.PI);
  tileGeo.rotateX(-Math.PI / 2);
  const tileM = new THREE.MeshStandardMaterial({ roughness: 0.75, side: THREE.DoubleSide });
  const ROW = 0.27, perRow = Math.floor(roofW / 0.22), rows = Math.floor((slopeL - 0.1) / ROW);
  const shades = ['#b4532f', '#a84a2a', '#bf5c35', '#c06a3e', '#9d4527'].map(c => new THREE.Color(c));
  const slopes = [];
  for (const side of [1, -1]) {
    const holder = new THREE.Group();
    holder.rotation.y = side === 1 ? 0 : Math.PI;
    roof.add(holder);
    const slope = new THREE.Group();
    slope.rotation.x = theta;          // local +z runs down the slope
    holder.add(slope);
    within(slope, () => {
      for (let x = -roofW / 2 + 0.1; x <= roofW / 2; x += 0.7) box(0.06, 0.1, slopeL, rafterM, x, -0.08, slopeL / 2);
      for (let z = 0.15; z < slopeL; z += ROW) box(roofW, 0.03, 0.04, battenM, 0, -0.015, z);
      box(roofW, 0.18, 0.04, mat('#f4f3ef', 0.8), 0, -0.1, slopeL);
      // gutter on the front eave
      if (side === 1) add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, roofW, 12, 1, true, Math.PI / 2, Math.PI), mat(C.charcoal, 0.5, 0.4)), 0, -0.15, slopeL + 0.06, { rz: Math.PI / 2 });
    });
    const inst = new THREE.InstancedMesh(tileGeo, tileM, rows * perRow);
    inst.castShadow = true; inst.receiveShadow = true;
    const m4 = new THREE.Matrix4();
    let n = 0;
    for (let r = 0; r < rows; r++) for (let i = 0; i < perRow; i++) {
      m4.makeTranslation(-roofW / 2 + 0.11 + i * 0.22 + (r % 2) * 0.02, 0.03, slopeL - 0.17 - r * ROW);
      inst.setMatrixAt(n, m4);
      inst.setColorAt(n, shades[(r * 7 + i * 3) % shades.length]);
      n++;
    }
    slope.add(inst);
    slopes.push({ slope, inst });
  }
  // ridge cap
  cyl(0.12, 0.12, roofW, mat(C.terracotta, 0.7), HCX, ridgeY + 0.05, HCZ, { rz: Math.PI / 2, seg: 14 });

  // the back slope is done; the front fills in row by row
  const front = slopes[0], FRONT_MAX = rows - 2;
  front.inst.count = 3 * perRow;
  // roofer standing on the battens just above the last row
  const roofer = new THREE.Group();
  roofer.rotation.x = -theta;          // stand upright on the slope
  front.slope.add(roofer);
  let rk;
  within(roofer, () => { rk = worker(0, 0, 0, { vest: C.orange }); });
  hammer(rk.hand);
  // a stack of tiles beside the roofer
  within(front.slope, () => {
    for (let i = 0; i < 4; i++) box(0.3, 0.05, 0.36, mat(C.terracotta, 0.8), 0.9, 0.05 + i * 0.05, 0.2);
  });
  let roofClock = 0;
  tick((t, dt) => {
    roofClock += dt;
    const done = Math.min(FRONT_MAX, 3 + Math.floor(roofClock / 4));
    front.inst.count = done * perRow;
    const edge = slopeL - 0.17 - (done - 1) * ROW;
    roofer.position.set(Math.sin(t * 0.25) * 1.6, 0.03, Math.max(0.2, edge - 0.35));
    rk.armR.rotation.x = -1.4 + Math.sin(t * 8) * 0.5;
  });

  // ladder against the front eave and tiles waiting on a pallet
  part('materials', 'above');
  within(group(1.0, 0, HZ1 + 0.75, { rx: -0.32 }), () => {
    const lad = mat(C.steel, 0.4, 0.6);
    for (const s of [-1, 1]) box(0.04, 2.9, 0.04, lad, s * 0.22, 1.42, 0);
    for (let i = 1; i < 10; i++) box(0.44, 0.025, 0.025, lad, 0, i * 0.28, 0);
  });
  within(group(2.7, 0, 0.9), () => {
    box(1.0, 0.1, 0.8, mat(C.oak, 0.85), 0, 0.05, 0);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) box(0.4, 0.06, 0.32, mat(i % 2 ? '#b4532f' : '#a84a2a', 0.8), -0.22 + j * 0.44, 0.13 + i * 0.065, 0);
  });
});

/* =========================================================================
   Canvas drawings
   ========================================================================= */
function drawNow(x, w, h) {
  const i = Math.max(0, SCENES.findIndex(s => s.key === MRB.scenario));
  const cur = SCENES[i];
  x.fillStyle = '#1f2329'; x.fillRect(0, 0, w, h);
  x.strokeStyle = C.blue; x.lineWidth = 10; x.strokeRect(5, 5, w - 10, h - 10);
  x.textBaseline = 'alphabetic';
  x.fillStyle = '#8fd0ff';
  x.font = `500 26px ${MONO}`;
  x.fillText(`SCENE ${i + 1} / ${SCENES.length}`, 38, 66);
  x.fillStyle = '#ffffff';
  x.font = `900 84px ${DISPLAY}`;
  while (x.measureText(cur.tab).width > w - 76) x.font = x.font.replace(/\d+px/, m => (parseInt(m) - 4) + 'px');
  x.fillText(cur.tab, 38, 160);
  for (let k = 0; k < SCENES.length; k++) {
    x.beginPath();
    x.arc(52 + k * 40, 222, 11, 0, Math.PI * 2);
    x.fillStyle = k === i ? C.blue : '#454b55';
    x.fill();
  }
  x.fillStyle = '#9aa3ae';
  x.font = `500 24px ${MONO}`;
  x.textAlign = 'right';
  x.fillText('VIEW →', w - 38, 231);
  x.textAlign = 'left';
}

function drawFence(x, w, h) {
  x.fillStyle = '#2c3038'; x.fillRect(0, 0, w, h);
  x.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < w; i += 32) x.fillRect(i, 0, 14, h);
  x.fillStyle = C.blue; x.fillRect(0, 10, w, 6); x.fillRect(0, h - 16, w, 6);
  x.textBaseline = 'middle';
  let px = 30;
  while (px < w) {
    x.font = `900 58px ${DISPLAY}`;
    x.fillStyle = '#ffffff';
    x.fillText('MRB CONSTRUCTION', px, h / 2 + 2);
    px += x.measureText('MRB CONSTRUCTION').width + 30;
    x.font = `500 28px ${MONO}`;
    x.fillStyle = '#9fb3c8';
    const tl = 'ONE-STOP CONSTRUCTION & INTERIOR WORKS';
    x.fillText(tl, px, h / 2 + 2);
    px += x.measureText(tl).width + 40;
    x.fillStyle = C.blue;
    x.beginPath(); x.arc(px, h / 2, 8, 0, Math.PI * 2); x.fill();
    px += 40;
  }
}

function drawOfficeLogo(x, w, h) {
  x.clearRect(0, 0, w, h);
  x.fillStyle = '#ffffff';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `900 120px ${DISPLAY}`;
  x.fillText('MRB', w / 2, h / 2 - 18);
  x.font = `500 26px ${MONO}`;
  x.fillStyle = '#9fd3ff';
  x.fillText('SITE OFFICE', w / 2, h - 30);
}

function drawSign(x, w, h) {
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#2c3038'; x.fillRect(0, 0, w, 230);
  x.fillStyle = C.blue; x.fillRect(0, 230, w, 14);
  x.textBaseline = 'alphabetic';
  x.fillStyle = '#ffffff';
  x.font = `900 92px ${DISPLAY}`;
  x.fillText('MRB', 50, 120);
  x.font = `800 42px ${DISPLAY}`;
  x.fillText('CONSTRUCTION SERVICES', 50, 180);
  x.font = `500 22px ${MONO}`;
  x.fillStyle = '#9fd3ff';
  x.fillText('ONE-STOP CONSTRUCTION & INTERIOR WORKS', 50, 214);
  x.fillStyle = '#2c3038';
  x.font = `800 40px ${DISPLAY}`;
  x.fillText('Ceilings · Cabinetry · Glass · Roofing', 50, 320);
  x.font = `500 26px ${MONO}`;
  x.fillStyle = '#5b6370';
  x.fillText('Stainless · Painting · Signages · Rattan', 50, 362);
  x.fillStyle = C.blue; x.fillRect(50, 410, w - 100, 4);
  x.fillStyle = '#2c3038';
  x.font = `800 46px ${DISPLAY}`;
  x.fillText(CONFIG.phones.map(p => p.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3')).join('  |  '), 50, 485);
  x.font = `500 30px ${MONO}`;
  x.fillStyle = '#5b6370';
  x.fillText(CONFIG.email, 50, 545);
}

/* =========================================================================
   Camera, controls and focus
   ========================================================================= */
const HOME = { pos: new THREE.Vector3(7.6, 9.4, 24.6), tgt: new THREE.Vector3(-0.6, 1.3, -0.8) };
const FOCUS = {
  about:    { pos: new THREE.Vector3(8.4, 3.4, 3.2),  tgt: new THREE.Vector3(4.4, 0.9, -3.5) },
  contact:  { pos: new THREE.Vector3(7.9, 2.2, 7.4),  tgt: new THREE.Vector3(4.8, 1.4, 3.4) },
  ceiling:  { pos: new THREE.Vector3(1.0, 1.5, 6.6),  tgt: new THREE.Vector3(-1.2, 2.2, -1.6) },
  cabinets: { pos: new THREE.Vector3(1.6, 3.0, 5.8),  tgt: new THREE.Vector3(-1.6, 1.0, -2.2) },
  glass:    { pos: new THREE.Vector3(2.6, 4.6, 12.4), tgt: new THREE.Vector3(-0.6, 1.5, -1.0) },
  roofing:  { pos: new THREE.Vector3(3.0, 6.2, 10.8), tgt: new THREE.Vector3(-1.0, 2.2, -1.0) }
};
const PINS = {
  about:    { label: 'About MRB',   at: new THREE.Vector3(4.4, 1.85, -3.4) },
  contact:  { label: 'Get a quote', at: new THREE.Vector3(4.8, 2.3, 3.4) }
};

const controls = new OrbitControls(camera, canvas);
Object.assign(controls, {
  enableDamping: true, dampingFactor: 0.08, enablePan: false,
  minDistance: 6, maxDistance: 34, rotateSpeed: 0.6, zoomSpeed: 0.7,
  minPolarAngle: 0.35, maxPolarAngle: 1.4, minAzimuthAngle: -0.2, maxAzimuthAngle: 1.6
});

// a narrow screen needs the camera further out to fit the lot
function fitScale() { const a = camera.aspect; return a < 1 ? Math.min(1.9, 0.95 / a) : a < 1.35 ? 1.1 : 1; }
function fitted(p, tgt) { return tgt.clone().add(p.clone().sub(tgt).multiplyScalar(fitScale())); }

const look = HOME.tgt.clone();
camera.position.copy(HOME.pos);
controls.target.copy(HOME.tgt);
let userMoved = false;
controls.addEventListener('start', () => { userMoved = true; });

const view = { x: 0, y: 0 };
let tween = null, saved = null;

function flyTo(pos, tgt, ox, oy, done) {
  controls.enabled = false;
  tween = { p0: camera.position.clone(), t0: look.clone(), x0: view.x, y0: view.y, p1: pos, t1: tgt, x1: ox, y1: oy, t: 0, dur: reduced ? 0 : 1100, done };
}
function drawerOffset() {
  const d = document.getElementById('drawer');
  return innerWidth <= 760
    ? [0, (d ? d.offsetHeight : innerHeight * 0.8) * 0.5]
    : [(d ? d.offsetWidth : 500) * 0.5, 0];
}
function focus(key) {
  if (!saved) saved = { pos: camera.position.clone(), tgt: controls.target.clone() };
  const [ox, oy] = drawerOffset();
  const f = FOCUS[key];
  if (f) flyTo(fitted(f.pos, f.tgt), f.tgt.clone(), ox, oy);
  else flyTo(camera.position.clone(), look.clone(), ox, oy);    // just make room for the drawer
}
function unfocus() {
  const back = saved || { pos: fitted(HOME.pos, HOME.tgt), tgt: HOME.tgt.clone() };
  saved = null;
  flyTo(back.pos, back.tgt, 0, 0, () => { controls.target.copy(back.tgt); controls.enabled = true; });
}
window.addEventListener('mrb:open', e => focus(e.detail.key));
window.addEventListener('mrb:close', unfocus);

function applyView() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (Math.abs(view.x) > 0.5 || Math.abs(view.y) > 0.5) camera.setViewOffset(w, h, view.x, view.y, w, h);
  else camera.clearViewOffset();
}
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  if (!userMoved && !saved && !tween) camera.position.copy(fitted(HOME.pos, HOME.tgt));
  controls.maxDistance = 34 * fitScale();
  applyView();
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);
resize();

/* =========================================================================
   Building, switching scenes
   ========================================================================= */
const STEP = 70, RISE_MS = 700, SINK_MS = 380, SINK_STEP = 14;
let active = null;

function prep(set) {
  set.parts.forEach((g, i) => {
    g.userData.base = g.position.clone();
    g.userData.delay = g.userData.from === 'grow' && i === 0 ? 0 : 120 + i * STEP;
  });
  set.end = 120 + set.parts.length * STEP + RISE_MS;
}
prep(site);
Object.values(SC).forEach(prep);

function showNow(set) {
  set.state = 'shown';
  set.parts.forEach(g => { g.visible = true; g.userData.dy = 0; g.scale.set(1, 1, 1); });
}
function hideNow(set) {
  set.state = 'hidden';
  set.parts.forEach(g => { g.visible = false; g.userData.dy = 0; g.scale.set(1, 1, 1); });
}

function setScenario(key, delay = 0) {
  const next = SC[key];
  if (!next || next === active) return;
  const now = performance.now();
  let wait = delay;
  if (active && active.state !== 'hidden') {
    if (reduced) hideNow(active);
    else { active.state = 'leaving'; active.exit = now; wait = Math.max(wait, 320); }
  }
  active = next;
  if (reduced) { showNow(next); return; }
  next.state = 'building';
  next.start = now + wait;
  next.parts.forEach(g => { g.visible = false; });
}
window.addEventListener('mrb:scenario', e => { if (site.state !== 'hidden') setScenario(e.detail.key); });

function startBuild() {
  if (site.state !== 'hidden') return;
  if (reduced) { showNow(site); setScenario(MRB.scenario || SCENES[0].key); return; }
  site.state = 'building';
  site.start = performance.now();
  setScenario(MRB.scenario || SCENES[0].key, site.end * 0.55);
}
if (MRB.revealed) startBuild();
window.addEventListener('mrb:reveal', startBuild);

const outBack = t => { const c = 1.5; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
const outCubic = t => 1 - (1 - t) ** 3;
const inOut = t => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const clamp01 = v => Math.min(1, Math.max(0, v));

function updateSet(set, now) {
  if (set.state === 'building') {
    const el = now - set.start;
    if (el < 0) return;
    for (const g of set.parts) {
      const k = clamp01((el - g.userData.delay) / RISE_MS);
      g.visible = el >= g.userData.delay;
      const from = g.userData.from;
      g.userData.dy = from === 'above' ? (1 - outBack(k)) * 4.5 : from === 'below' ? -(1 - outCubic(k)) * 4.3 : 0;
      if (from === 'grow') { const s = 0.001 + outBack(k) * 0.999; g.scale.set(s, 1, s); }
    }
    if (el > set.end) showNow(set);
  } else if (set.state === 'leaving') {
    const el = now - set.exit, n = set.parts.length;
    for (let i = 0; i < n; i++) {
      const g = set.parts[n - 1 - i];      // last built leaves first
      const k = clamp01((el - i * SINK_STEP) / SINK_MS);
      if (g.userData.from === 'grow') { const s = Math.max(0.001, 1 - outCubic(k)); g.scale.set(s, 1, s); }
      else g.userData.dy = -k * k * 4;
      if (k >= 1) g.visible = false;
    }
    if (el > n * SINK_STEP + SINK_MS) hideNow(set);
  }
}

const isReady = () => site.state === 'shown' && active && active.state === 'shown';

/* =========================================================================
   Pointer: hover labels and clicks
   ========================================================================= */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const tip = document.getElementById('tip');
let pointer = null, hovered = null, down = null;

function hotspotOf(obj) {
  while (obj && !obj.userData.hotspot) obj = obj.parent;
  return obj;
}
function pick(cx, cy) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const targets = active ? site.hot.concat(active.hot) : site.hot;
  const hit = ray.intersectObjects(targets, true)[0];
  return hit ? hotspotOf(hit.object) : null;
}
canvas.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') pointer = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerleave', () => { pointer = null; });
// what's under the cursor is remembered at press time, so a press that
// starts on a hotspot still counts if the pointer wobbles off it slightly
canvas.addEventListener('pointerdown', e => {
  pointer = { x: e.clientX, y: e.clientY };
  down = { x: e.clientX, y: e.clientY, g: isReady() ? hovered || pick(e.clientX, e.clientY) : null };
});
canvas.addEventListener('pointerup', e => {
  if (!down || !isReady()) return;
  // a press that barely moved is a click, however long it was held (trackpads)
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), first = down.g;
  down = null;
  if (moved > 10) return;
  const g = first || pick(e.clientX, e.clientY);
  if (!g || !MRB.open) return;
  // the crane sign opens the service for the scene it names
  MRB.open(g.userData.hotspot === 'next' ? MRB.scenario : g.userData.hotspot);
});

function updateHover() {
  const g = pointer && isReady() && !tween ? pick(pointer.x, pointer.y) : null;
  if (g !== hovered) {
    hovered = g;
    canvas.style.cursor = g ? 'pointer' : '';
    tip.classList.toggle('on', !!g);
    if (g) tip.textContent = g.userData.label;
  }
  if (g) tip.style.transform = `translate(${pointer.x + 16}px, ${pointer.y + 14}px)`;
}

/* ---- pins: HTML buttons pinned to 3D anchors ---------------------------- */
const pinBox = document.getElementById('pins');
const pinEls = {};
Object.entries(PINS).forEach(([key, p]) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pin';
  b.textContent = p.label;
  b.addEventListener('click', () => MRB.open && MRB.open(key));
  pinBox.appendChild(b);
  pinEls[key] = b;
});
pinBox.classList.add('off');
const proj = new THREE.Vector3();
function updatePins() {
  const off = !isReady() || !!(MRB.current && MRB.current());
  pinBox.classList.toggle('off', off);
  if (off) return;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  for (const key in PINS) {
    const p = PINS[key], el = pinEls[key];
    const show = !p.scene || (active && active.key === p.scene);
    el.hidden = !show;
    if (!show) continue;
    proj.copy(p.at).project(camera);
    el.hidden = proj.z > 1;
    el.style.transform = `translate(${(proj.x + 1) / 2 * w}px, ${(1 - proj.y) / 2 * h}px)`;
  }
}

/* =========================================================================
   Loop
   ========================================================================= */
let first = true, last = performance.now(), time = 0;

function frameLoop(now) {
  requestAnimationFrame(frameLoop);
  now = now || performance.now();
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (!reduced) time += dt;

  updateSet(site, now);
  for (const k in SC) updateSet(SC[k], now);

  const live = [site, ...Object.values(SC)].filter(set => set.state !== 'hidden');
  for (const set of live) {
    for (const g of set.parts) { g.position.copy(g.userData.base); g.position.y += g.userData.dy || 0; }
    if (set.state === 'shown' || set.state === 'building') for (const fn of set.ticks) fn(time, reduced ? 0 : dt);
  }

  if (tween) {
    // advance by frame time, capped, so a slow frame (opening a panel) can't make the camera jump
    tween.t += Math.min(dt * 1000, 34);
    const k = tween.dur ? Math.min(1, tween.t / tween.dur) : 1, e = inOut(k);
    camera.position.lerpVectors(tween.p0, tween.p1, e);
    look.lerpVectors(tween.t0, tween.t1, e);
    view.x = tween.x0 + (tween.x1 - tween.x0) * e;
    view.y = tween.y0 + (tween.y1 - tween.y0) * e;
    applyView();
    camera.updateProjectionMatrix();
    camera.lookAt(look);
    if (k >= 1) { const d = tween.done; tween = null; if (d) d(); }
  } else if (controls.enabled) {
    controls.update();
    look.copy(controls.target);
  }

  // hover only changes the cursor and shows a label; nothing moves
  updateHover();

  updatePins();
  renderer.render(scene, camera);

  if (first) { first = false; root.classList.add('scene-ready'); root.classList.remove('no-webgl'); }
}
requestAnimationFrame(frameLoop);

// canvas text uses the web fonts: draw again once they've loaded
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => textTex.forEach(t => t.redraw()));
refreshNext();
