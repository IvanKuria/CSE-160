// asgn2.js — 3-humped camel main entry point

var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_GlobalRotateMatrix;\n' +
  'void main() {\n' +
  '  gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;\n' +
  '}\n';

var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 u_FragColor;\n' +
  'void main() {\n' +
  '  gl_FragColor = u_FragColor;\n' +
  '}\n';

// GL globals (referenced by Cube.js, Sphere.js, Camel.js)
var canvas;
var gl;
var a_Position;
var u_FragColor;
var u_ModelMatrix;
var u_GlobalRotateMatrix;

// Scene state
var g_globalAngleX = -10;
var g_globalAngleY = 25;

// Joint angles (degrees)
var g_neckAngle  = -25;   // negative tilts head forward
var g_headAngle  = 15;
var g_snoutAngle = 0;
var g_frontLegAngle = 0;
var g_backLegAngle  = 0;
var g_tailAngle  = 0;
var g_neckBob    = 0;   // animation-driven bob added on top of slider

// Animation state
var g_animationOn = true;
var g_pokeMode = false;
var g_pokeStart = 0;

// Time
var g_startTime = performance.now() / 1000;
var g_seconds = 0;
var g_lastFrame = performance.now();

// Mouse-drag state
var g_dragging = false;
var g_lastMouseX = 0;
var g_lastMouseY = 0;

// Written by Claude
function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) { console.log('Failed to get WebGL context'); return; }
  gl.enable(gl.DEPTH_TEST);
}

// Written by Claude
function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to init shaders'); return;
  }
  a_Position           = gl.getAttribLocation(gl.program, 'a_Position');
  u_FragColor          = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_ModelMatrix        = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
}

// Written by Claude
function addUIActions() {
  document.getElementById('angleXSlider').addEventListener('input', function() {
    g_globalAngleX = parseFloat(this.value);
  });
  document.getElementById('angleYSlider').addEventListener('input', function() {
    g_globalAngleY = parseFloat(this.value);
  });
  document.getElementById('neckSlider').addEventListener('input', function() {
    g_neckAngle = parseFloat(this.value);
  });
  document.getElementById('headSlider').addEventListener('input', function() {
    g_headAngle = parseFloat(this.value);
  });
  document.getElementById('snoutSlider').addEventListener('input', function() {
    g_snoutAngle = parseFloat(this.value);
  });
  document.getElementById('animOn').addEventListener('click', function() {
    g_animationOn = true;
  });
  document.getElementById('animOff').addEventListener('click', function() {
    g_animationOn = false;
  });

  // Mouse: shift+click triggers poke animation; otherwise drag rotates view
  canvas.addEventListener('mousedown', function(ev) {
    if (ev.shiftKey) {
      g_pokeMode = true;
      g_pokeStart = g_seconds;
      return;
    }
    g_dragging = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  });
  canvas.addEventListener('mousemove', function(ev) {
    if (!g_dragging) return;
    var dx = ev.clientX - g_lastMouseX;
    var dy = ev.clientY - g_lastMouseY;
    g_globalAngleY += dx * 0.5;
    g_globalAngleX += dy * 0.5;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
    document.getElementById('angleXSlider').value = g_globalAngleX;
    document.getElementById('angleYSlider').value = g_globalAngleY;
  });
  canvas.addEventListener('mouseup',   function() { g_dragging = false; });
  canvas.addEventListener('mouseleave',function() { g_dragging = false; });
}

// Written by Claude
function updateAnimationAngles() {
  if (g_pokeMode) {
    // Quick jig + extra hump bounce (the hump-wave itself is computed in renderCamel)
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

// Written by Claude
function renderScene() {
  var globalRot = new Matrix4()
    .rotate(g_globalAngleX, 1, 0, 0)
    .rotate(g_globalAngleY, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRot.elements);

  gl.clearColor(0.78, 0.88, 0.95, 1.0);   // sky blue
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Sand ground (a wide, thin cube)
  var ground = new Matrix4().translate(0, -0.96, 0).scale(3.0, 0.05, 2.0);
  drawCube(gl, ground, new Float32Array([0.94, 0.84, 0.55, 1.0]));

  renderCamel(gl);
}

// Written by Claude
function tick() {
  g_seconds = performance.now() / 1000 - g_startTime;
  updateAnimationAngles();
  renderScene();

  // FPS indicator
  var now = performance.now();
  var fps = 1000 / (now - g_lastFrame);
  g_lastFrame = now;
  var fpsEl = document.getElementById('fps');
  if (fpsEl) fpsEl.textContent = 'FPS: ' + fps.toFixed(1);

  requestAnimationFrame(tick);
}

// Written by Claude
function main() {
  setupWebGL();
  connectVariablesToGLSL();
  initCube(gl);
  initSphere(gl);
  initCylinder(gl);
  addUIActions();
  requestAnimationFrame(tick);
}
