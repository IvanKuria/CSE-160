// asgn3.js — Desert Oasis, main entry point.
// Wires WebGL setup, input, the render loop, and the small game state machine
// (camel AI, jug pickups, day/night cycle, win condition).

const VSHADER = `
attribute vec4 a_Position;
attribute vec2 a_UV;
uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;
varying vec2 v_UV;
void main() {
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
  v_UV = a_UV;
}`;

// Fragment shader: select one of up to 6 textures (or solid base color) and
// linear-interpolate with u_baseColor by u_texColorWeight. u_tint applies the
// day/night sky tint as a final multiplier so the whole world dims at night.
const FSHADER = `
precision mediump float;
varying vec2 v_UV;
uniform vec4 u_baseColor;
uniform float u_texColorWeight;
uniform int u_whichTexture;
uniform vec3 u_tint;
uniform sampler2D u_Sampler0;
uniform sampler2D u_Sampler1;
uniform sampler2D u_Sampler2;
uniform sampler2D u_Sampler3;
uniform sampler2D u_Sampler4;
uniform sampler2D u_Sampler5;
void main() {
  vec4 texColor = vec4(1.0);
  if      (u_whichTexture == 0) texColor = texture2D(u_Sampler0, v_UV);
  else if (u_whichTexture == 1) texColor = texture2D(u_Sampler1, v_UV);
  else if (u_whichTexture == 2) texColor = texture2D(u_Sampler2, v_UV);
  else if (u_whichTexture == 3) texColor = texture2D(u_Sampler3, v_UV);
  else if (u_whichTexture == 4) texColor = texture2D(u_Sampler4, v_UV);
  else if (u_whichTexture == 5) texColor = texture2D(u_Sampler5, v_UV);
  vec4 c = mix(u_baseColor, texColor, u_texColorWeight);
  gl_FragColor = vec4(c.rgb * u_tint, c.a);
}`;

// GL globals shared with Cube.js/World.js/Camel.js
var canvas, gl;
var a_Position, a_UV;
var u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix;
var u_baseColor, u_texColorWeight, u_whichTexture, u_tint;
var u_Samplers = [];

// Scene state
var camera;
var g_keys = {};
var g_pointerLocked = false;
var g_lastFrame = performance.now();
var g_seconds = 0;
var g_startTime = performance.now() / 1000;

// Game state
var g_jugs = 0;
var g_won = false;
const CAMEL_OASIS = { x: 55, z: 55 };
var g_camelPos  = { x: 6.5,  z: 36.5 };
var g_camelFromX = 6.5, g_camelFromZ = 36.5;
var g_camelToX   = 6.5, g_camelToZ   = 36.5;
var g_camelMoveStart = 0;
var g_camelFacing = 0;
var g_camelPath = null;       // array of [x,z] cell centers
var g_camelPathIdx = 0;
var g_camelArrived = false;
var g_camelStepDur = 0.8;     // seconds per cell

// Reusable scratch (avoid `new` in render loop)
var g_identity = new Matrix4();
var g_modelMat = new Matrix4();
var g_tmpVec = new Vector3();
var g_tintArr = new Float32Array(3);

// claude wrote this
function main() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: false });
  if (!gl) { alert('WebGL not supported'); return; }
  // Resize canvas to actual rendered size for crisp pixels
  resizeCanvasToDisplay();
  window.addEventListener('resize', resizeCanvasToDisplay);

  if (!initShaders(gl, VSHADER, FSHADER)) { console.error('shader init failed'); return; }

  a_Position         = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV               = gl.getAttribLocation(gl.program, 'a_UV');
  u_ModelMatrix      = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix       = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_baseColor        = gl.getUniformLocation(gl.program, 'u_baseColor');
  u_texColorWeight   = gl.getUniformLocation(gl.program, 'u_texColorWeight');
  u_whichTexture     = gl.getUniformLocation(gl.program, 'u_whichTexture');
  u_tint             = gl.getUniformLocation(gl.program, 'u_tint');
  for (let i = 0; i < 6; i++) {
    u_Samplers.push(gl.getUniformLocation(gl.program, 'u_Sampler' + i));
  }

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.frontFace(gl.CCW);
  gl.clearColor(0.7, 0.85, 0.95, 1.0);

  initCube(gl);
  initWorld();
  camera = new Camera(canvas);
  // Spawn the player on the south-west side facing diagonally toward the oasis
  // so the pyramid (NW), village (NE), and oasis (SE) are all visible at start.
  camera.eye.elements[0] = 4.0; camera.eye.elements[2] = 40.0; camera.eye.elements[1] = 1.7 + terrainAt(4.0, 40.0);
  camera.at.elements[0]  = 10.0; camera.at.elements[2] = 36.0; camera.at.elements[1] = camera.eye.elements[1];
  camera._updateView();

  hookInput();

  initTextures(gl, u_Samplers, () => {
    g_lastFrame = performance.now();
    requestAnimationFrame(tick);
  });
}

// claude wrote this
function resizeCanvasToDisplay() {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.floor(canvas.clientWidth * dpr);
  const h = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w; canvas.height = h;
    if (gl) gl.viewport(0, 0, w, h);
    if (camera) {
      camera.projectionMatrix.setPerspective(camera.fov, w / h, 0.1, 1000);
    }
  }
}

// ---- Input ----
// claude wrote this
function hookInput() {
  window.addEventListener('keydown', e => { g_keys[e.code] = true; });
  window.addEventListener('keyup',   e => { g_keys[e.code] = false; });

  canvas.addEventListener('click', () => {
    if (!g_pointerLocked) canvas.requestPointerLock();
  });
  document.addEventListener('pointerlockchange', () => {
    g_pointerLocked = (document.pointerLockElement === canvas);
  });
  document.addEventListener('mousemove', e => {
    if (!g_pointerLocked) return;
    const yawSpeed = 0.15, pitchSpeed = 0.12;
    if (e.movementX) camera.panLeft(-e.movementX * yawSpeed);
    if (e.movementY) camera.pitch(-e.movementY * pitchSpeed);
  });

  // Left click = delete, right click = add. Suppress context menu on canvas.
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('mousedown', e => {
    if (!g_pointerLocked) return;
    if (e.button === 0) modifyBlock(false);
    else if (e.button === 2) modifyBlock(true);
  });
}

// Pick the map cell ~1.5 units in front of the camera (ignoring pitch) and
// either raise its wall by one or knock the top block off.
// claude wrote this
function modifyBlock(add) {
  const f = camera.forwardXZ(g_tmpVec);
  const tx = camera.eye.elements[0] + f.elements[0] * 1.5;
  const tz = camera.eye.elements[2] + f.elements[2] * 1.5;
  const cx = Math.floor(tx), cz = Math.floor(tz);
  if (!inBounds(cx, cz)) return;
  const cell = getCell(cx, cz);
  if (add) {
    if (cell.h < 4) setCell(cx, cz, cell.h + 1, cell.kind || TEX_SAND);
  } else {
    if (cell.h > 0) setCell(cx, cz, cell.h - 1, cell.kind);
  }
  // Invalidate the camel's path so player edits actually re-route it
  g_camelPath = null;
}

// Returns true if (x, z) is inside a solid wall the player should bounce off.
// Water cells are passable. Walls of any height block (player is short).
// claude wrote this
function isBlocked(x, z) {
  const cx = Math.floor(x), cz = Math.floor(z);
  if (!inBounds(cx, cz)) return true;
  const h = g_map[idx(cx, cz)];
  if (h === 0) return false;
  return g_kind[idx(cx, cz)] !== TEX_WATER;
}

// Swept axis-by-axis collision: try moving in X first, roll back if it collides,
// then try Z. Gives the standard "slide along the wall" feel rather than full stop.
const PLAYER_RADIUS = 0.30;
// claude wrote this
function collideAndCommit(prevX, prevZ) {
  const e = camera.eye.elements, a = camera.at.elements;
  const newX = e[0], newZ = e[2];
  // Move in X
  e[0] = newX;
  if (isBlocked(e[0] + PLAYER_RADIUS, prevZ) ||
      isBlocked(e[0] - PLAYER_RADIUS, prevZ) ||
      isBlocked(e[0], prevZ + PLAYER_RADIUS) ||
      isBlocked(e[0], prevZ - PLAYER_RADIUS)) {
    e[0] = prevX;
  }
  // Then Z, with the (possibly reverted) X
  e[2] = newZ;
  if (isBlocked(e[0] + PLAYER_RADIUS, e[2]) ||
      isBlocked(e[0] - PLAYER_RADIUS, e[2]) ||
      isBlocked(e[0], e[2] + PLAYER_RADIUS) ||
      isBlocked(e[0], e[2] - PLAYER_RADIUS)) {
    e[2] = prevZ;
  }
  // Match `at` to whatever displacement actually happened
  a[0] += (e[0] - newX);
  a[2] += (e[2] - newZ);
}

// ---- Per-frame movement sampling ----
// claude wrote this
function sampleMovement(dt) {
  const moveSpeed = 6.0 * dt;   // units / second
  const turnSpeed = 110 * dt;   // degrees / second

  // Snapshot pre-move position so we can roll back per-axis on collision.
  const prevX = camera.eye.elements[0];
  const prevZ = camera.eye.elements[2];

  if (g_keys['KeyW']) camera.moveForward(moveSpeed);
  if (g_keys['KeyS']) camera.moveBackwards(moveSpeed);
  if (g_keys['KeyA']) camera.moveLeft(moveSpeed);
  if (g_keys['KeyD']) camera.moveRight(moveSpeed);
  if (g_keys['KeyQ']) camera.panLeft(turnSpeed);
  if (g_keys['KeyE']) camera.panRight(turnSpeed);

  // Wall collision (per-axis sliding)
  collideAndCommit(prevX, prevZ);

  // Keep camera at "person height" above terrain
  const e = camera.eye.elements;
  const a = camera.at.elements;
  const eyeY = 1.6 + terrainAt(e[0], e[2]);
  const dy = eyeY - e[1];
  e[1] += dy; a[1] += dy;
  // Hard bounds (boundary wall blocks, but belt-and-suspenders)
  const margin = 0.4;
  e[0] = Math.max(margin, Math.min(MAP_SIZE - margin, e[0]));
  e[2] = Math.max(margin, Math.min(MAP_SIZE - margin, e[2]));
  camera._updateView();
}

// ---- Game logic ----
// claude wrote this
function pickupJugIfNearby() {
  // Player walks into a water-jug cell → collect it
  const px = camera.eye.elements[0], pz = camera.eye.elements[2];
  const cx = Math.floor(px), cz = Math.floor(pz);
  // Check 3×3 around the player
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const x = cx + dx, z = cz + dz;
    if (!inBounds(x, z)) continue;
    if (g_map[idx(x, z)] === 1 && g_kind[idx(x, z)] === TEX_WATER) {
      // The big oasis is also water-textured; exclude that area
      if (x >= 52 && x <= 58 && z >= 52 && z <= 58) continue;
      const dxp = (x + 0.5) - px, dzp = (z + 0.5) - pz;
      if (dxp * dxp + dzp * dzp < 1.2) {
        setCell(x, z, 0, TEX_SAND);
        g_jugs++;
      }
    }
  }
}

// BFS-based camel AI. Whenever the world changes (block edited) we invalidate
// the path so the player's edits actually affect the camel's route.
// claude wrote this
function recomputeCamelPath() {
  g_camelPath = findPath(
    Math.floor(g_camelPos.x), Math.floor(g_camelPos.z),
    CAMEL_OASIS.x, CAMEL_OASIS.z
  );
  // Skip the first node (it's where the camel already is)
  g_camelPathIdx = g_camelPath ? 1 : 0;
}

// claude wrote this
function startNextCamelStep() {
  if (!g_camelPath || g_camelPathIdx >= g_camelPath.length) return false;
  const [nx, nz] = g_camelPath[g_camelPathIdx++];
  g_camelFromX = g_camelPos.x; g_camelFromZ = g_camelPos.z;
  g_camelToX = nx; g_camelToZ = nz;
  g_camelMoveStart = g_seconds;
  const ang = Math.atan2(nz - g_camelFromZ, nx - g_camelFromX);
  g_camelFacing = -ang * 180 / Math.PI;
  return true;
}

// claude wrote this
function updateCamel(dt) {
  if (g_camelArrived) return;
  // Need a path?
  if (!g_camelPath) {
    recomputeCamelPath();
    if (!g_camelPath) return;     // no route — idle until player clears one
    startNextCamelStep();
  }

  const t = Math.min(1, (g_seconds - g_camelMoveStart) / g_camelStepDur);
  g_camelPos.x = lerp(g_camelFromX, g_camelToX, t);
  g_camelPos.z = lerp(g_camelFromZ, g_camelToZ, t);

  if (t >= 1) {
    // Snap exactly to target, then start next step if any
    g_camelPos.x = g_camelToX;
    g_camelPos.z = g_camelToZ;
    if (!startNextCamelStep()) {
      // Path consumed
      const dx = CAMEL_OASIS.x + 0.5 - g_camelPos.x;
      const dz = CAMEL_OASIS.z + 0.5 - g_camelPos.z;
      if (dx*dx + dz*dz < 4) g_camelArrived = true;
      else g_camelPath = null;    // try again next frame
    }
  }
  g_camelLegPhase += dt * 8;
}

// claude wrote this
function lerp(a, b, t) { return a + (b - a) * t; }

// claude wrote this
function checkWin() {
  if (g_won) return;
  if (g_jugs >= 3 && g_camelArrived) {
    g_won = true;
    document.getElementById('win').textContent = 'You made it! The camel reached the oasis.';
  }
}

// ---- Render ----
// claude wrote this
function dayNightTint(sec) {
  // ~60s cycle: dawn → noon → dusk → night → dawn
  const phase = (sec % 60) / 60;
  // Two control colors interpolated by phase
  let r, g, b;
  if (phase < 0.25) {       // dawn → noon (orange → white)
    const t = phase / 0.25;
    r = lerp(0.95, 1.00, t); g = lerp(0.70, 1.00, t); b = lerp(0.55, 1.00, t);
  } else if (phase < 0.50) { // noon → dusk
    const t = (phase - 0.25) / 0.25;
    r = lerp(1.00, 0.98, t); g = lerp(1.00, 0.65, t); b = lerp(1.00, 0.45, t);
  } else if (phase < 0.75) { // dusk → night
    const t = (phase - 0.50) / 0.25;
    r = lerp(0.98, 0.20, t); g = lerp(0.65, 0.25, t); b = lerp(0.45, 0.45, t);
  } else {                   // night → dawn
    const t = (phase - 0.75) / 0.25;
    r = lerp(0.20, 0.95, t); g = lerp(0.25, 0.70, t); b = lerp(0.45, 0.55, t);
  }
  return [r, g, b, phase];
}

// claude wrote this
function phaseLabel(p) {
  if (p < 0.25) return 'dawn';
  if (p < 0.50) return 'day';
  if (p < 0.75) return 'dusk';
  return 'night';
}

// claude wrote this
function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);

  const [tr, tg, tb, phase] = dayNightTint(g_seconds);
  g_tintArr[0] = tr; g_tintArr[1] = tg; g_tintArr[2] = tb;
  gl.uniform3fv(u_tint, g_tintArr);

  // World first (writes depth) — sky will fill in any pixel the world didn't cover.
  drawWorld(gl, a_Position, a_UV, u_whichTexture, u_texColorWeight, u_baseColor, u_ModelMatrix, g_identity);

  // Camel — solid color
  renderCamel(gl, g_camelPos.x, terrainAt(g_camelPos.x, g_camelPos.z), g_camelPos.z, g_camelFacing);

  // Sky LAST — textured cube centered on camera so it appears infinitely far.
  // Depth test on (so anything closer occludes it), depth write off, cull disabled
  // because we're inside the cube and need both winding orders to render.
  const ex = camera.eye.elements[0], ey = camera.eye.elements[1], ez = camera.eye.elements[2];
  g_modelMat.setIdentity().translate(ex, ey, ez).scale(800, 800, 800);
  gl.uniform1f(u_texColorWeight, 1.0);
  gl.uniform4f(u_baseColor, 1, 1, 1, 1);
  gl.uniform1i(u_whichTexture, TEX_SKY);
  bindCubeBuffer(gl, a_Position, a_UV);
  gl.disable(gl.CULL_FACE);
  gl.depthMask(false);
  drawCube(gl, g_modelMat);
  gl.depthMask(true);
  gl.enable(gl.CULL_FACE);

  // HUD
  document.getElementById('phase').textContent = phaseLabel(phase);
  document.getElementById('jugs').textContent  = g_jugs;
  const dx = 28.5 - g_camelPos.x, dz = 28.5 - g_camelPos.z;
  document.getElementById('camelProgress').textContent = Math.max(0, Math.hypot(dx, dz)).toFixed(1) + ' to oasis';
}

// claude wrote this
function tick(now) {
  const dt = Math.min(0.05, (now - g_lastFrame) / 1000);
  g_lastFrame = now;
  g_seconds = now / 1000 - g_startTime;

  sampleMovement(dt);
  pickupJugIfNearby();
  updateCamel(dt);
  checkWin();
  renderScene();

  const fps = 1 / dt;
  document.getElementById('fps').textContent = fps.toFixed(0);
  requestAnimationFrame(tick);
}
