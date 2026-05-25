// asgn4.js — Phong lighting on the 3-humped camel scene.
// Adds per-vertex normals, a world-space Phong fragment shader, a movable point
// light + a spotlight (each toggleable), a normal-visualization mode, an OBJ
// model, and an orbit camera (so specular has a real eye position).

// ===================== SHADERS =====================
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec3 a_Normal;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_NormalMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  varying vec3 v_Normal;
  varying vec3 v_WorldPos;
  void main() {
    vec4 worldPos = u_ModelMatrix * a_Position;
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * worldPos;
    v_WorldPos = worldPos.xyz;
    // Transform the normal into world space with the normal matrix
    v_Normal = normalize(vec3(u_NormalMatrix * vec4(a_Normal, 0.0)));
  }`;

var FSHADER_SOURCE = `
  precision mediump float;
  varying vec3 v_Normal;
  varying vec3 v_WorldPos;
  uniform vec4 u_FragColor;           // per-object diffuse color
  uniform int  u_lightingOn;
  uniform int  u_normalViz;
  uniform vec3 u_eye;                 // camera position (world space)
  // point light
  uniform int  u_pointOn;
  uniform vec3 u_LightPos;
  uniform vec3 u_LightColor;
  // spot light
  uniform int  u_spotOn;
  uniform vec3 u_SpotPos;
  uniform vec3 u_SpotDir;             // direction the spotlight points (normalized)
  uniform vec3 u_SpotColor;
  uniform float u_SpotInner;          // cos(inner cone angle)
  uniform float u_SpotOuter;          // cos(outer cone angle)

  vec3 phong(vec3 N, vec3 V, vec3 L, vec3 lc, vec3 base) {
    float diff = max(dot(N, L), 0.0);
    vec3  R = reflect(-L, N);
    float spec = pow(max(dot(R, V), 0.0), 32.0);   // shininess hard-coded
    return diff * base * lc + spec * lc * 0.6;      // specular coeff hard-coded
  }

  void main() {
    vec3 N = normalize(v_Normal);

    // Normal visualization: paint the raw normal as the color.
    if (u_normalViz == 1) { gl_FragColor = vec4(N, 1.0); return; }

    // Lighting disabled: show the flat diffuse color.
    if (u_lightingOn == 0) { gl_FragColor = u_FragColor; return; }

    vec3 base = u_FragColor.rgb;
    vec3 V = normalize(u_eye - v_WorldPos);
    vec3 color = 0.2 * base;                         // ambient (hard-coded coeff)

    if (u_pointOn == 1) {
      vec3 L = normalize(u_LightPos - v_WorldPos);
      color += phong(N, V, L, u_LightColor, base);
    }
    if (u_spotOn == 1) {
      vec3 L = normalize(u_SpotPos - v_WorldPos);
      float t = dot(normalize(-L), normalize(u_SpotDir));   // cosine vs cone axis
      float f = smoothstep(u_SpotOuter, u_SpotInner, t);    // soft cone edge
      color += f * phong(N, V, L, u_SpotColor, base);
    }
    gl_FragColor = vec4(color, u_FragColor.a);
  }`;

// ===================== GL GLOBALS =====================
var canvas, gl;
var a_Position, a_Normal;
var u_FragColor, u_ModelMatrix, u_NormalMatrix, u_ViewMatrix, u_ProjectionMatrix;
var u_lightingOn, u_normalViz, u_eye;
var u_pointOn, u_LightPos, u_LightColor;
var u_spotOn, u_SpotPos, u_SpotDir, u_SpotColor, u_SpotInner, u_SpotOuter;

var g_projMatrix = new Matrix4();
var g_viewMatrix = new Matrix4();
var g_normalMatrix = new Matrix4();   // reused scratch for the normal matrix

// ===================== SCENE STATE =====================
// Camera orbit (driven by sliders + mouse drag)
var g_globalAngleX = -12;   // pitch (degrees)
var g_globalAngleY = 30;    // yaw (degrees)
var g_camRadius = 6.5;

// Camel joint angles (degrees)
var g_neckAngle = -25, g_headAngle = 15, g_snoutAngle = 0;
var g_frontLegAngle = 0, g_backLegAngle = 0, g_tailAngle = 0, g_neckBob = 0;
var g_animationOn = true, g_pokeMode = false, g_pokeStart = 0;

// Lighting state
var g_lightingOn = true;
var g_normalViz = false;
var g_pointOn = true;
var g_spotOn = true;
var g_lightSpin = true;
var g_lightAngle = 0;       // radians, point-light orbit angle
var g_lightHeight = 2.2;
var g_lightRadius = 3.2;
var g_lightPos = [0, 2.2, 3.2];
var g_lightHue = 45;        // degrees
var g_lightColor = [1.0, 0.92, 0.78];

// Spotlight (fixed pose, aimed at the origin from above-front)
var g_spotPos = [0.0, 4.0, 1.8];
var g_spotColor = [0.55, 0.75, 1.0];      // cool blue
var g_spotInner = Math.cos(14 * Math.PI / 180);
var g_spotOuter = Math.cos(24 * Math.PI / 180);

// Time
var g_startTime = performance.now() / 1000;
var g_seconds = 0;
var g_lastFrame = performance.now();

// Mouse-drag
var g_dragging = false, g_lastMouseX = 0, g_lastMouseY = 0;

// ===================== SETUP =====================
// claude wrote this
function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) { console.log('Failed to get WebGL context'); return; }
  gl.enable(gl.DEPTH_TEST);
}

// claude wrote this
function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to init shaders'); return;
  }
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  a_Normal   = gl.getAttribLocation(gl.program, 'a_Normal');

  u_FragColor        = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_ModelMatrix      = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_NormalMatrix     = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  u_ViewMatrix       = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');

  u_lightingOn = gl.getUniformLocation(gl.program, 'u_lightingOn');
  u_normalViz  = gl.getUniformLocation(gl.program, 'u_normalViz');
  u_eye        = gl.getUniformLocation(gl.program, 'u_eye');

  u_pointOn    = gl.getUniformLocation(gl.program, 'u_pointOn');
  u_LightPos   = gl.getUniformLocation(gl.program, 'u_LightPos');
  u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');

  u_spotOn    = gl.getUniformLocation(gl.program, 'u_spotOn');
  u_SpotPos   = gl.getUniformLocation(gl.program, 'u_SpotPos');
  u_SpotDir   = gl.getUniformLocation(gl.program, 'u_SpotDir');
  u_SpotColor = gl.getUniformLocation(gl.program, 'u_SpotColor');
  u_SpotInner = gl.getUniformLocation(gl.program, 'u_SpotInner');
  u_SpotOuter = gl.getUniformLocation(gl.program, 'u_SpotOuter');

  g_projMatrix.setPerspective(50, canvas.width / canvas.height, 0.1, 100);
}

// claude wrote this
// Shared by every draw* function: set model + normal matrices.
function setMatrices(gl, M) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  g_normalMatrix.setInverseOf(M);
  g_normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, g_normalMatrix.elements);
}

// claude wrote this
// Shared by every draw* function: bind interleaved [pos3, normal3] (stride 24).
function bindPosNormal(gl, buffer) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 24, 12);
  gl.enableVertexAttribArray(a_Normal);
}

// ===================== UI =====================
// claude wrote this
function addUIActions() {
  bindSlider('angleXSlider', function (v) { g_globalAngleX = v; });
  bindSlider('angleYSlider', function (v) { g_globalAngleY = v; });
  bindSlider('neckSlider',  function (v) { g_neckAngle = v; });
  bindSlider('headSlider',  function (v) { g_headAngle = v; });
  bindSlider('snoutSlider', function (v) { g_snoutAngle = v; });

  bindSlider('lightAngleSlider', function (v) {
    g_lightAngle = v * Math.PI / 180;
  });
  bindSlider('lightHeightSlider', function (v) { g_lightHeight = v; });
  bindSlider('lightHueSlider', function (v) {
    g_lightHue = v;
    g_lightColor = hsvToRgb(g_lightHue / 360, 0.55, 1.0);
  });

  click('animOn',  function () { g_animationOn = true; });
  click('animOff', function () { g_animationOn = false; });
  click('lightOn',  function () { g_lightingOn = true; });
  click('lightOff', function () { g_lightingOn = false; });
  click('normOn',  function () { g_normalViz = true; });
  click('normOff', function () { g_normalViz = false; });
  click('pointToggle', function () { g_pointOn = !g_pointOn; });
  click('spotToggle',  function () { g_spotOn = !g_spotOn; });
  click('spinToggle',  function () { g_lightSpin = !g_lightSpin; });

  // Mouse: shift+click pokes the camel; drag orbits the camera.
  canvas.addEventListener('mousedown', function (ev) {
    if (ev.shiftKey) { g_pokeMode = true; g_pokeStart = g_seconds; return; }
    g_dragging = true; g_lastMouseX = ev.clientX; g_lastMouseY = ev.clientY;
  });
  canvas.addEventListener('mousemove', function (ev) {
    if (!g_dragging) return;
    g_globalAngleY += (ev.clientX - g_lastMouseX) * 0.5;
    g_globalAngleX += (ev.clientY - g_lastMouseY) * 0.5;
    g_lastMouseX = ev.clientX; g_lastMouseY = ev.clientY;
    setVal('angleXSlider', g_globalAngleX);
    setVal('angleYSlider', g_globalAngleY);
  });
  canvas.addEventListener('mouseup',    function () { g_dragging = false; });
  canvas.addEventListener('mouseleave', function () { g_dragging = false; });
}

// claude wrote this
function bindSlider(id, fn) {
  var el = document.getElementById(id);
  if (el) el.addEventListener('input', function () { fn(parseFloat(this.value)); });
}
// claude wrote this
function click(id, fn) {
  var el = document.getElementById(id);
  if (el) el.addEventListener('click', fn);
}
// claude wrote this
function setVal(id, v) { var el = document.getElementById(id); if (el) el.value = v; }

// claude wrote this
// HSV -> RGB (s,v in [0,1], h in [0,1])
function hsvToRgb(h, s, v) {
  var i = Math.floor(h * 6), f = h * 6 - i;
  var p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  var r, g, b;
  switch (i % 6) {
    case 0: r=v; g=t; b=p; break;
    case 1: r=q; g=v; b=p; break;
    case 2: r=p; g=v; b=t; break;
    case 3: r=p; g=q; b=v; break;
    case 4: r=t; g=p; b=v; break;
    default: r=v; g=p; b=q; break;
  }
  return [r, g, b];
}

// ===================== ANIMATION =====================
// claude wrote this
function updateAnimationAngles() {
  if (g_pokeMode) {
    g_frontLegAngle = 35 * Math.sin(g_seconds * 10);
    g_backLegAngle  = 35 * Math.sin(g_seconds * 10 + Math.PI);
    g_tailAngle     = 30 * Math.sin(g_seconds * 12);
    if (g_seconds - g_pokeStart > 3.0) g_pokeMode = false;
    return;
  }
  if (g_animationOn) {
    g_frontLegAngle = 25 * Math.sin(g_seconds * 3);
    g_backLegAngle  = 25 * Math.sin(g_seconds * 3 + Math.PI);
    g_tailAngle     = 15 * Math.sin(g_seconds * 5);
    g_neckBob       = 5 * Math.sin(g_seconds * 2);
  } else {
    g_neckBob = 0;
  }
}

// ===================== RENDER =====================
// claude wrote this
function computeCamera() {
  var pitch = Math.max(-85, Math.min(85, g_globalAngleX)) * Math.PI / 180;
  var yaw = g_globalAngleY * Math.PI / 180;
  var R = g_camRadius;
  var ex = R * Math.cos(pitch) * Math.sin(yaw);
  var ey = R * Math.sin(pitch) + 0.3;
  var ez = R * Math.cos(pitch) * Math.cos(yaw);
  g_viewMatrix.setLookAt(ex, ey, ez, 0, 0.3, 0, 0, 1, 0);
  gl.uniformMatrix4fv(u_ViewMatrix, false, g_viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_projMatrix.elements);
  gl.uniform3f(u_eye, ex, ey, ez);
}

// claude wrote this
function pushLightingUniforms() {
  gl.uniform1i(u_lightingOn, g_lightingOn ? 1 : 0);
  gl.uniform1i(u_normalViz, g_normalViz ? 1 : 0);

  gl.uniform1i(u_pointOn, g_pointOn ? 1 : 0);
  gl.uniform3fv(u_LightPos, g_lightPos);
  gl.uniform3fv(u_LightColor, g_lightColor);

  gl.uniform1i(u_spotOn, g_spotOn ? 1 : 0);
  gl.uniform3fv(u_SpotPos, g_spotPos);
  var dir = normalize3([0 - g_spotPos[0], 0.3 - g_spotPos[1], 0 - g_spotPos[2]]);
  gl.uniform3fv(u_SpotDir, dir);
  gl.uniform3fv(u_SpotColor, g_spotColor);
  gl.uniform1f(u_SpotInner, g_spotInner);
  gl.uniform1f(u_SpotOuter, g_spotOuter);
}

// claude wrote this
function normalize3(a) {
  var m = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0]/m, a[1]/m, a[2]/m];
}

// claude wrote this
// Draw a small unlit cube to mark a light's position/color.
function drawLightMarker(pos, color) {
  gl.uniform1i(u_lightingOn, 0);
  gl.uniform1i(u_normalViz, 0);
  drawCube(gl, new Matrix4().translate(pos[0], pos[1], pos[2]).scale(0.18, 0.18, 0.18), color);
  // restore current state for anything drawn afterward
  gl.uniform1i(u_lightingOn, g_lightingOn ? 1 : 0);
  gl.uniform1i(u_normalViz, g_normalViz ? 1 : 0);
}

// claude wrote this
function renderScene() {
  gl.clearColor(0.07, 0.09, 0.14, 1.0);   // dark so lighting reads clearly
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  computeCamera();
  pushLightingUniforms();

  // Ground (wide thin cube)
  drawCube(gl, new Matrix4().translate(0, -0.96, 0).scale(6.0, 0.05, 5.0),
           new Float32Array([0.85, 0.80, 0.62, 1.0]));

  // The animal (camel) — lit with no changes to Camel.js
  renderCamel(gl);

  // A standalone cube
  drawCube(gl, new Matrix4().translate(1.7, -0.69, 0.7).scale(0.5, 0.5, 0.5),
           new Float32Array([0.35, 0.55, 0.95, 1.0]));

  // A couple of spheres (easiest place to read lighting)
  drawSphere(gl, new Matrix4().translate(-1.7, -0.71, 0.6).scale(0.5, 0.5, 0.5),
             new Float32Array([0.90, 0.30, 0.30, 1.0]));
  drawSphere(gl, new Matrix4().translate(-2.0, -0.76, -0.6).scale(0.38, 0.38, 0.38),
             new Float32Array([0.35, 0.85, 0.45, 1.0]));

  // OBJ model (torus knot) on a pedestal, slowly spinning
  drawCube(gl, new Matrix4().translate(1.7, -0.78, -1.0).scale(0.7, 0.4, 0.7),
           new Float32Array([0.45, 0.45, 0.50, 1.0]));
  drawModel(gl,
            new Matrix4().translate(1.7, 0.05, -1.0).rotate(g_seconds * 30, 0, 1, 0).scale(1.1, 1.1, 1.1),
            new Float32Array([0.80, 0.55, 0.95, 1.0]));

  // Light markers (unlit) — show where each light is
  if (g_pointOn) drawLightMarker(g_lightPos, new Float32Array([g_lightColor[0], g_lightColor[1], g_lightColor[2], 1.0]));
  if (g_spotOn)  drawLightMarker(g_spotPos,  new Float32Array([g_spotColor[0], g_spotColor[1], g_spotColor[2], 1.0]));
}

// claude wrote this
function tick() {
  g_seconds = performance.now() / 1000 - g_startTime;
  updateAnimationAngles();

  if (g_lightSpin) {
    g_lightAngle += 0.012;
    setVal('lightAngleSlider', (g_lightAngle * 180 / Math.PI) % 360);
  }
  g_lightPos = [
    g_lightRadius * Math.cos(g_lightAngle),
    g_lightHeight,
    g_lightRadius * Math.sin(g_lightAngle),
  ];

  renderScene();

  var now = performance.now();
  var fps = 1000 / (now - g_lastFrame);
  g_lastFrame = now;
  var fpsEl = document.getElementById('fps');
  if (fpsEl) fpsEl.textContent = 'FPS: ' + fps.toFixed(0);

  requestAnimationFrame(tick);
}

// claude wrote this
function main() {
  setupWebGL();
  connectVariablesToGLSL();
  initCube(gl);
  initSphere(gl);
  initCylinder(gl);
  loadModel(gl, '../assets/model.obj');
  addUIActions();
  requestAnimationFrame(tick);
}
