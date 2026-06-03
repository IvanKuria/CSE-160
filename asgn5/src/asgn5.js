// =============================================================================
// CSE 160 — Assignment 5 : A 3D World with Three.js
// Theme: UC Santa Cruz — a redwood-forest clearing with campus buildings,
//        a bell tower, roaming deer, an ocean-sky skybox, and the campus
//        BANANA SLUG mascot that crawls along the path (the WOW feature).
//
// Everything is loaded as ES modules from a CDN via the import map in the HTML,
// so there is no build step. Asset paths are relative so it works on GitHub Pages.
// =============================================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader }    from 'three/addons/loaders/GLTFLoader.js';

// Count of primitive meshes added to the scene, reported in the console so we
// can confirm we clear the "20+ primitives" rubric requirement.
let primitiveCount = 0;
function track(obj) { primitiveCount += 1; return obj; }

// -----------------------------------------------------------------------------
// 1. RENDERER, SCENE, CAMERA, CONTROLS
// -----------------------------------------------------------------------------
const canvas   = document.querySelector('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
// Soft distance fog tinted like the sky gives the forest depth and hides the
// hard edge where the ground plane meets the skybox horizon.
scene.fog = new THREE.Fog(0xbcd4e6, 60, 170);

// Perspective camera — the rubric explicitly asks for perspective projection.
const camera = new THREE.PerspectiveCamera(
  55,                                   // field of view
  window.innerWidth / window.innerHeight,
  0.1,                                  // near plane
  1000                                  // far plane
);
camera.position.set(22, 14, 30);

// OrbitControls = mouse navigation (drag to orbit, scroll to zoom, right-drag pan).
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 2, 0);
controls.maxPolarAngle = Math.PI * 0.495; // stop just above the horizon (no going underground)
controls.minDistance = 6;
controls.maxDistance = 90;

// -----------------------------------------------------------------------------
// 2. PROCEDURAL TEXTURES (CanvasTexture)
//    Grass, bark, and a stucco wall are painted onto <canvas> elements at load
//    time. This guarantees real textured surfaces with zero external image
//    dependencies — handy for GitHub Pages where a missing file 404s silently.
// -----------------------------------------------------------------------------
function makeCanvas(size, paint) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  paint(cv.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const grassTexture = makeCanvas(256, (ctx, s) => {
  ctx.fillStyle = '#4a7c3a';
  ctx.fillRect(0, 0, s, s);
  // speckle with lighter/darker blades of "grass"
  for (let i = 0; i < 4000; i++) {
    const x = (i * 71) % s;
    const y = (i * 167) % s;
    const shade = 60 + ((i * 53) % 70);
    ctx.fillStyle = `rgb(${shade - 20}, ${shade + 40}, ${shade - 10})`;
    ctx.fillRect(x, y, 2, 3);
  }
});
grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(60, 60);

const barkTexture = makeCanvas(128, (ctx, s) => {
  ctx.fillStyle = '#6b4a2f';
  ctx.fillRect(0, 0, s, s);
  // vertical reddish streaks like redwood bark
  for (let x = 0; x < s; x += 3) {
    const v = 40 + ((x * 37) % 60);
    ctx.fillStyle = `rgb(${90 + v}, ${50 + (v >> 1)}, ${30 + (v >> 2)})`;
    ctx.fillRect(x, 0, 2, s);
  }
});
barkTexture.wrapS = barkTexture.wrapT = THREE.RepeatWrapping;
barkTexture.repeat.set(1, 3);

const wallTexture = makeCanvas(128, (ctx, s) => {
  ctx.fillStyle = '#d8cbb0';
  ctx.fillRect(0, 0, s, s);
  // faint horizontal courses + speckle to read as plaster/stone
  for (let y = 0; y < s; y += 16) {
    ctx.fillStyle = 'rgba(120,100,80,0.25)';
    ctx.fillRect(0, y, s, 1);
  }
  for (let i = 0; i < 1200; i++) {
    const x = (i * 53) % s, y = (i * 97) % s;
    ctx.fillStyle = `rgba(150,130,100,${(i % 5) / 20})`;
    ctx.fillRect(x, y, 2, 2);
  }
});

// -----------------------------------------------------------------------------
// 3. LIGHTS  (three different kinds — rubric requires ≥3 distinct types)
// -----------------------------------------------------------------------------
// (a) HemisphereLight: sky-blue from above, earthy green bounce from below.
const hemiLight = new THREE.HemisphereLight(0xbfe3ff, 0x4a6638, 0.85);
scene.add(hemiLight);

// (b) DirectionalLight: the sun. Casts the scene's shadows.
const sun = new THREE.DirectionalLight(0xfff2d6, 2.2);
sun.position.set(40, 55, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera;            // tighten frustum so shadows stay crisp
sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60;
sc.near = 1; sc.far = 200;
sun.shadow.bias = -0.0003;
scene.add(sun);

// (c) PointLight: warm glow from the path lamp post (created in section 8).
const lampLight = new THREE.PointLight(0xffd28a, 30, 22, 2);
lampLight.position.set(0, 4.2, 2);
lampLight.castShadow = true;
lampLight.shadow.mapSize.set(1024, 1024);
scene.add(lampLight);

// (Bonus low ambient base so deep shade never goes fully black.)
scene.add(new THREE.AmbientLight(0x404a44, 0.4));

// -----------------------------------------------------------------------------
// 4. SKYBOX (textured cubemap — the Monterey Bay sky/ocean horizon)
// -----------------------------------------------------------------------------
const skybox = new THREE.CubeTextureLoader()
  .setPath('../assets/skybox/')
  .load(['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg']);
skybox.colorSpace = THREE.SRGBColorSpace;
scene.background = skybox;

// -----------------------------------------------------------------------------
// 5. GROUND (textured PlaneGeometry)
// -----------------------------------------------------------------------------
const ground = track(new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.MeshStandardMaterial({ map: grassTexture, roughness: 1 })
));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// -----------------------------------------------------------------------------
// 6. THE WALKING PATH (a smooth curve the slug and benches follow)
// -----------------------------------------------------------------------------
const pathCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-26, 0, 22),
  new THREE.Vector3(-12, 0, 12),
  new THREE.Vector3(  0, 0,  4),
  new THREE.Vector3(  8, 0, -6),
  new THREE.Vector3(  5, 0, -18),
  new THREE.Vector3( -6, 0, -28),
], false, 'catmullrom', 0.5);

// Lay flat paver tiles (thin boxes) along the curve so the path is visible.
const paverMat = new THREE.MeshStandardMaterial({ color: 0xb6a88c, roughness: 0.9 });
const PAVERS = 40;
for (let i = 0; i < PAVERS; i++) {
  const u = i / (PAVERS - 1);
  const p = pathCurve.getPointAt(u);
  const tan = pathCurve.getTangentAt(u);
  const paver = track(new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 1.6), paverMat));
  paver.position.set(p.x, 0.09, p.z);
  paver.rotation.y = Math.atan2(tan.x, tan.z);
  paver.receiveShadow = true;
  scene.add(paver);
}

// -----------------------------------------------------------------------------
// 7. BUILDERS for the world's primitive shapes
//    Kinds used: Cylinder, Cone, Box, Sphere/Icosahedron, Plane.
// -----------------------------------------------------------------------------

// Redwood tree = textured cylinder trunk + 2 stacked cones of foliage.
const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2f5d34, roughness: 0.9 });
const trunkMat   = new THREE.MeshStandardMaterial({ map: barkTexture, roughness: 1 });
function makeTree(x, z, scale = 1) {
  const tree = new THREE.Group();

  const trunkH = 10 * scale;
  const trunk = track(new THREE.Mesh(
    new THREE.CylinderGeometry(0.5 * scale, 0.8 * scale, trunkH, 10), trunkMat));
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  tree.add(trunk);

  // two cones of foliage, stacked, tapering upward
  for (let i = 0; i < 2; i++) {
    const cone = track(new THREE.Mesh(
      new THREE.ConeGeometry((3.2 - i * 1.0) * scale, (6 - i) * scale, 12), foliageMat));
    cone.position.y = (trunkH - 1 + i * 3.2) * 1 + 1;
    cone.castShadow = true;
    tree.add(cone);
  }
  tree.position.set(x, 0, z);
  scene.add(tree);
  return tree;
}

// Campus building = a textured box with a flat roof slab.
function makeBuilding(x, z, w, h, d, color) {
  const b = new THREE.Group();
  const walls = track(new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ map: wallTexture, color, roughness: 0.95 })));
  walls.position.y = h / 2;
  walls.castShadow = walls.receiveShadow = true;
  b.add(walls);

  const roof = track(new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6),
    new THREE.MeshStandardMaterial({ color: 0x7a4b3a, roughness: 0.9 })));
  roof.position.y = h + 0.25;
  roof.castShadow = true;
  b.add(roof);

  b.position.set(x, 0, z);
  scene.add(b);
  return b;
}

// Bell tower = stacked boxes + a cylinder belfry + a cone roof (a campus landmark).
function makeBellTower(x, z) {
  const t = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ map: wallTexture, color: 0xe7ddca, roughness: 0.95 });

  const shaft = track(new THREE.Mesh(new THREE.BoxGeometry(4, 18, 4), baseMat));
  shaft.position.y = 9; shaft.castShadow = true; t.add(shaft);

  const belfry = track(new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 3, 12), baseMat));
  belfry.position.y = 19.5; belfry.castShadow = true; t.add(belfry);

  const roof = track(new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 4, 12),
    new THREE.MeshStandardMaterial({ color: 0x8a3b2e, roughness: 0.85 })));
  roof.position.y = 23; roof.castShadow = true; t.add(roof);

  t.position.set(x, 0, z);
  scene.add(t);
  return t;
}

// Rock = a low-poly icosahedron, randomly squashed for variety.
const rockMat = new THREE.MeshStandardMaterial({ color: 0x8c8c84, roughness: 1, flatShading: true });
function makeRock(x, z, s = 1) {
  const rock = track(new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), rockMat));
  rock.position.set(x, s * 0.5, z);
  rock.rotation.set(x, z, s);
  rock.scale.y = 0.7;
  rock.castShadow = rock.receiveShadow = true;
  scene.add(rock);
  return rock;
}

// Bench = a seat slab + back slab on two box legs (placed beside the path).
const woodMat = new THREE.MeshStandardMaterial({ color: 0x6e4a2c, roughness: 0.9 });
function makeBench(x, z, rotY) {
  const bench = new THREE.Group();
  const seat = track(new THREE.Mesh(new THREE.BoxGeometry(3, 0.25, 1), woodMat));
  seat.position.y = 1; seat.castShadow = true; bench.add(seat);
  const back = track(new THREE.Mesh(new THREE.BoxGeometry(3, 1, 0.2), woodMat));
  back.position.set(0, 1.6, -0.4); back.castShadow = true; bench.add(back);
  for (const lx of [-1.3, 1.3]) {
    const leg = track(new THREE.Mesh(new THREE.BoxGeometry(0.25, 1, 0.9), woodMat));
    leg.position.set(lx, 0.5, 0); leg.castShadow = true; bench.add(leg);
  }
  bench.position.set(x, 0, z);
  bench.rotation.y = rotY;
  scene.add(bench);
  return bench;
}

// Lamp post = a cylinder pole + a glowing sphere lamp (matches the PointLight).
function makeLampPost(x, z) {
  const post = new THREE.Group();
  const pole = track(new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.2, 4.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 })));
  pole.position.y = 2.2; pole.castShadow = true; post.add(pole);

  const bulb = track(new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xfff1c0, emissive: 0xffd070, emissiveIntensity: 1.6 })));
  bulb.position.y = 4.4; post.add(bulb);

  post.position.set(x, 0, z);
  scene.add(post);
  return post;
}

// -----------------------------------------------------------------------------
// 8. POPULATE THE WORLD
// -----------------------------------------------------------------------------
// Redwoods ringing the clearing (avoiding the path corridor near x≈0).
const treeSpots = [
  [-30, -10, 1.3], [-24, 6, 1.0], [-34, 14, 1.5], [22, 14, 1.2],
  [30, 2, 1.4],    [26, -16, 1.1], [16, 24, 1.0],  [-18, 28, 1.3],
  [34, 24, 1.2],   [-30, 30, 1.1], [12, -30, 1.4], [-14, -34, 1.2],
];
treeSpots.forEach(([x, z, s]) => makeTree(x, z, s));

// Campus buildings (a little "college" cluster off to one side).
makeBuilding(24, -6, 10, 7, 8, 0xdcc9a8);
makeBuilding(34, -2, 8, 5, 7, 0xcdb88f);
makeBuilding(20, 6, 9, 6, 9, 0xe2d2b0);
makeBellTower(30, 8);

// Rocks scattered near the trees.
[[-20, 10, 1.2], [18, 18, 1.6], [-26, -4, 1.0], [10, -10, 1.4], [-8, 16, 0.9]]
  .forEach(([x, z, s]) => makeRock(x, z, s));

// Benches and a lamp post along the path.
makeBench(-10, 9, 0.7);
makeBench(7, -4, -0.5);
makeLampPost(0, 2);   // sits right where the PointLight is

// -----------------------------------------------------------------------------
// 9. THE BANANA SLUG  —  WOW FEATURE  (built from primitives, animated)
//    A chain of tapered spheres rides along the path curve. Each frame every
//    segment samples a point a little further back on the curve, so the body
//    naturally follows the path's bends, and a phase-shifted sine wave bobs
//    each segment to fake a peristaltic crawl. Eye stalks ride the head.
// -----------------------------------------------------------------------------
function makeSlug() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf2d63b, roughness: 0.5 });
  const mantleMat = new THREE.MeshStandardMaterial({ color: 0xe0b800, roughness: 0.5 });
  const eyeMat  = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3 });

  const N = 14;
  const segments = [];
  for (let i = 0; i < N; i++) {
    // taper: fattest a third of the way back, thin at the tail
    const f = i / (N - 1);
    const r = 0.85 * Math.sin(Math.PI * (0.15 + f * 0.8)) + 0.12;
    const seg = track(new THREE.Mesh(
      new THREE.SphereGeometry(r, 14, 12), i > 1 && i < 5 ? mantleMat : bodyMat));
    seg.castShadow = true;
    seg.userData.r = r;
    group.add(seg);
    segments.push(seg);
  }

  // Two eye stalks (cylinder + dark sphere tip) parented to the head segment.
  const head = segments[0];
  const stalks = [];
  for (const side of [-1, 1]) {
    const stalk = new THREE.Group();
    const rod = track(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.9, 6), bodyMat));
    rod.position.y = 0.45; rod.castShadow = true;
    const tip = track(new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), eyeMat));
    tip.position.y = 0.95;
    stalk.add(rod, tip);
    stalk.position.set(side * 0.28, 0.45, 0.2);
    head.add(stalk);
    stalks.push(stalk);
  }

  scene.add(group);

  const gap = 0.011;     // spacing between segments in curve-parameter space
  const speed = 0.018;   // how fast the head travels along the loop

  function update(t) {
    const headU = (t * speed) % 1;
    for (let i = 0; i < N; i++) {
      let u = (headU - i * gap) % 1;
      if (u < 0) u += 1;
      const p = pathCurve.getPointAt(u);
      const bob = Math.sin(t * 6 - i * 0.7) * 0.06;   // peristaltic ripple
      segments[i].position.set(p.x, p.y + segments[i].userData.r + 0.1 + bob, p.z);
    }
    // Aim the head down the path so the eye stalks point forward.
    const tan = pathCurve.getTangentAt(headU);
    head.rotation.y = Math.atan2(tan.x, tan.z);
    // Gentle independent wiggle of the eye stalks.
    stalks[0].rotation.z = Math.sin(t * 4) * 0.25;
    stalks[1].rotation.z = Math.sin(t * 4 + 1.2) * 0.25;
  }

  return { update };
}
const slug = makeSlug();

// -----------------------------------------------------------------------------
// 10. DEER  —  textured GLB model (loaded with GLTFLoader)
//     The model is auto-scaled from its bounding box and dropped onto the
//     ground; two copies are placed so the herd grazes the clearing.
// -----------------------------------------------------------------------------
const deerPlacements = [
  { x: -6,  z: 0,   ry: 0.6,  target: 2.6 },
  { x: -14, z: -6,  ry: -1.2, target: 2.2 },
];
new GLTFLoader().load(
  '../assets/deer.glb',
  (gltf) => {
    deerPlacements.forEach((d) => {
      const deer = gltf.scene.clone(true);
      // normalize size: scale so the model stands `target` units tall
      const box = new THREE.Box3().setFromObject(deer);
      const size = new THREE.Vector3(); box.getSize(size);
      const s = d.target / size.y;
      deer.scale.setScalar(s);
      // re-measure to seat its feet on the ground
      const box2 = new THREE.Box3().setFromObject(deer);
      deer.position.set(d.x, -box2.min.y, d.z);
      deer.rotation.y = d.ry;
      deer.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(deer);
    });
    console.log('[asgn5] deer.glb loaded');
  },
  undefined,
  (err) => console.error('[asgn5] failed to load deer.glb', err)
);

// -----------------------------------------------------------------------------
// 11. RESIZE HANDLING + ANIMATION LOOP
// -----------------------------------------------------------------------------
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);
onResize();

const clock = new THREE.Clock();
function animate() {
  const t = clock.getElapsedTime();
  slug.update(t);                          // WOW: crawl the banana slug
  lampLight.intensity = 30 + Math.sin(t * 8) * 3; // subtle lamp flicker
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// Hide the loading splash once the first frame is ready.
requestAnimationFrame(() => {
  document.querySelector('#loading')?.classList.add('hidden');
  console.log(`[asgn5] primitive meshes in scene: ${primitiveCount} (+ deer GLB)`);
  animate();
});
