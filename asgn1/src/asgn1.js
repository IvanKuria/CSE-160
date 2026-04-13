// asgn1.js — WebGL Painting Program

// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'uniform float u_PointSize;\n' +
  'void main() {\n' +
  '  gl_Position = a_Position;\n' +
  '  gl_PointSize = u_PointSize;\n' +
  '}\n';

// Fragment shader program — filter logic written by Claude
var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 u_FragColor;\n' +
  'uniform int u_FilterType;\n' +
  'void main() {\n' +
  '  vec4 col = u_FragColor;\n' +
  '  if (u_FilterType == 1) {\n' +
  '    float gray = dot(col.rgb, vec3(0.299, 0.587, 0.114));\n' +
  '    col = vec4(gray, gray, gray, col.a);\n' +
  '  } else if (u_FilterType == 2) {\n' +
  '    float gray = dot(col.rgb, vec3(0.299, 0.587, 0.114));\n' +
  '    col = vec4(gray * 1.2, gray * 1.0, gray * 0.8, col.a);\n' +
  '  } else if (u_FilterType == 3) {\n' +
  '    col = vec4(1.0 - col.r, 1.0 - col.g, 1.0 - col.b, col.a);\n' +
  '  } else if (u_FilterType == 4) {\n' +
  '    col = vec4(col.r * 1.5, col.g * 0.5, col.b * 1.5, col.a);\n' +
  '  }\n' +
  '  gl_FragColor = col;\n' +
  '}\n';

// Global variables
var canvas;
var gl;
var a_Position;
var u_FragColor;
var u_PointSize;
var u_FilterType;

var g_shapesList = [];        // The list of all shapes to draw
var g_selectedFilter = 0;     // 0=normal, 1=grayscale, 2=sepia, 3=invert, 4=neon
var g_selectedColor = [1.0, 0.0, 0.0, 1.0];
var g_selectedSize = 10;
var g_selectedType = 'point';  // 'point', 'triangle', or 'circle'
var g_selectedSegments = 10;

// --- Point class --- written by Claude
class Point {
  constructor() {
    this.type = 'point';
    this.position = [0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 5.0;
  }

  render() {
    var xy = this.position;
    var rgba = this.color;

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniform1f(u_PointSize, this.size);
    gl.vertexAttrib3f(a_Position, xy[0], xy[1], 0.0);
    gl.drawArrays(gl.POINTS, 0, 1);
  }
}

function setupWebGL() {
  canvas = document.getElementById('webgl');

  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  u_PointSize = gl.getUniformLocation(gl.program, 'u_PointSize');
  if (!u_PointSize) {
    console.log('Failed to get the storage location of u_PointSize');
    return;
  }

  u_FilterType = gl.getUniformLocation(gl.program, 'u_FilterType');
  if (u_FilterType === null) {
    console.log('Failed to get the storage location of u_FilterType');
    return;
  }
}

// Written by Claude
function addActionsForHtmlUI() {
  // Color sliders
  document.getElementById('redSlider').addEventListener('input', function() {
    g_selectedColor[0] = this.value / 100;
  });
  document.getElementById('greenSlider').addEventListener('input', function() {
    g_selectedColor[1] = this.value / 100;
  });
  document.getElementById('blueSlider').addEventListener('input', function() {
    g_selectedColor[2] = this.value / 100;
  });

  // Size slider
  document.getElementById('sizeSlider').addEventListener('input', function() {
    g_selectedSize = this.value;
  });

  // Shape type buttons
  document.getElementById('pointButton').addEventListener('click', function() {
    g_selectedType = 'point';
  });
  document.getElementById('triangleButton').addEventListener('click', function() {
    g_selectedType = 'triangle';
  });
  document.getElementById('circleButton').addEventListener('click', function() {
    g_selectedType = 'circle';
  });

  // Segment slider
  document.getElementById('segmentSlider').addEventListener('input', function() {
    g_selectedSegments = this.value;
  });

  // Clear button
  document.getElementById('clearButton').addEventListener('click', function() {
    g_shapesList = [];
    renderAllShapes();
  });

  // Draw picture button
  document.getElementById('drawPictureButton').addEventListener('click', function() {
    drawPicture();
  });

  // Filter buttons
  document.getElementById('filterNormal').addEventListener('click', function() {
    g_selectedFilter = 0;
    renderAllShapes();
  });
  document.getElementById('filterGrayscale').addEventListener('click', function() {
    g_selectedFilter = 1;
    renderAllShapes();
  });
  document.getElementById('filterSepia').addEventListener('click', function() {
    g_selectedFilter = 2;
    renderAllShapes();
  });
  document.getElementById('filterInvert').addEventListener('click', function() {
    g_selectedFilter = 3;
    renderAllShapes();
  });
  document.getElementById('filterNeon').addEventListener('click', function() {
    g_selectedFilter = 4;
    renderAllShapes();
  });
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addActionsForHtmlUI();

  canvas.onmousedown = function(ev) { click(ev); };
  canvas.onmousemove = function(ev) { if (ev.buttons == 1) { click(ev); } };

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function click(ev) {
  var x = ev.clientX;
  var y = ev.clientY;
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

  var shape;
  if (g_selectedType == 'triangle') {
    shape = new Triangle();
  } else if (g_selectedType == 'circle') {
    shape = new Circle();
    shape.segments = g_selectedSegments;
  } else {
    shape = new Point();
  }

  shape.position = [x, y];
  shape.color = g_selectedColor.slice();
  shape.size = g_selectedSize;

  g_shapesList.push(shape);
  renderAllShapes();
}

// Written by Claude
function drawCircleFill(cx, cy, r, segments) {
  var angleStep = 360 / segments;
  for (var angle = 0; angle < 360; angle += angleStep) {
    var a1 = angle * Math.PI / 180;
    var a2 = (angle + angleStep) * Math.PI / 180;
    drawTriangle([
      cx, cy,
      cx + r * Math.cos(a1), cy + r * Math.sin(a1),
      cx + r * Math.cos(a2), cy + r * Math.sin(a2)
    ]);
  }
}

// Written by Claude
function drawMountingHole(cx, cy) {
  // Gold outer ring
  gl.uniform4f(u_FragColor, 0.85, 0.70, 0.20, 1.0);
  drawCircleFill(cx, cy, 0.055, 20);
  // Hollow center (PCB green)
  gl.uniform4f(u_FragColor, 0.0, 0.45, 0.15, 1.0);
  drawCircleFill(cx, cy, 0.03, 20);
}

function drawPicture() {
  // Raspberry Pi Zero 2W board
  // Layout: GPIO top, mini HDMI bottom-left, 2x micro USB bottom-right, SD right edge

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform1i(u_FilterType, g_selectedFilter);

  // === PCB board (green) ===
  gl.uniform4f(u_FragColor, 0.0, 0.45, 0.15, 1.0);
  drawTriangle([-0.85, -0.40,  0.85, -0.40,  0.85,  0.40]);
  drawTriangle([-0.85, -0.40,  0.85,  0.40, -0.85,  0.40]);

  // === Mounting holes (gold rings with hollow centers, 4 corners) ===
  drawMountingHole(-0.72,  0.30);   // top-left
  drawMountingHole( 0.76,  0.30);   // top-right
  drawMountingHole(-0.72, -0.30);   // bottom-left
  drawMountingHole( 0.72, -0.30);   // bottom-right

  // === GPIO header (2x20 pins along top edge) ===
  // Dark plastic base
  gl.uniform4f(u_FragColor, 0.15, 0.15, 0.15, 1.0);
  drawTriangle([-0.55, 0.26,  0.64, 0.26,  0.64, 0.40]);
  drawTriangle([-0.55, 0.26,  0.64, 0.40, -0.55, 0.40]);

  // Individual gold pin circles — row 1 (20 pins)
  gl.uniform4f(u_FragColor, 0.85, 0.70, 0.20, 1.0);
  var pinStartX = -0.52;
  var pinSpacing = 0.056;
  for (var i = 0; i < 20; i++) {
    var px = pinStartX + i * pinSpacing;
    drawCircleFill(px, 0.31, 0.018, 8);
  }
  // Row 2 (20 pins)
  for (var i = 0; i < 20; i++) {
    var px = pinStartX + i * pinSpacing;
    drawCircleFill(px, 0.37, 0.018, 8);
  }

  // === SoC chip (center, large square) ===
  gl.uniform4f(u_FragColor, 0.12, 0.12, 0.12, 1.0);
  drawTriangle([-0.18, -0.18,  0.18, -0.18,  0.18,  0.18]);
  drawTriangle([-0.18, -0.18,  0.18,  0.18, -0.18,  0.18]);
  // Chip label text line
  gl.uniform4f(u_FragColor, 0.25, 0.25, 0.25, 1.0);
  drawTriangle([-0.12, 0.02,  0.12, 0.02,  0.12, 0.06]);
  drawTriangle([-0.12, 0.02,  0.12, 0.06, -0.12, 0.06]);

  // === Metallic RF shield / WiFi-BT module (next to SoC) ===
  gl.uniform4f(u_FragColor, 0.65, 0.65, 0.65, 1.0);  // silver metallic
  drawTriangle([ 0.22, -0.14,  0.42, -0.14,  0.42,  0.06]);
  drawTriangle([ 0.22, -0.14,  0.42,  0.06,  0.22,  0.06]);
  // Subtle edge highlight
  gl.uniform4f(u_FragColor, 0.55, 0.55, 0.55, 1.0);
  drawTriangle([ 0.22, -0.14,  0.42, -0.14,  0.42, -0.12]);
  drawTriangle([ 0.22, -0.14,  0.42, -0.12,  0.22, -0.12]);

  // === Mini HDMI port (bottom-left edge) ===
  gl.uniform4f(u_FragColor, 0.6, 0.6, 0.6, 1.0);
  drawTriangle([-0.55, -0.40, -0.40, -0.40, -0.40, -0.32]);
  drawTriangle([-0.55, -0.40, -0.40, -0.32, -0.55, -0.32]);
  // Port opening
  gl.uniform4f(u_FragColor, 0.1, 0.1, 0.1, 1.0);
  drawTriangle([-0.53, -0.41, -0.42, -0.41, -0.42, -0.35]);
  drawTriangle([-0.53, -0.41, -0.42, -0.35, -0.53, -0.35]);

  // === Micro USB power port (bottom-right area) ===
  gl.uniform4f(u_FragColor, 0.6, 0.6, 0.6, 1.0);
  drawTriangle([ 0.20, -0.40,  0.35, -0.40,  0.35, -0.32]);
  drawTriangle([ 0.20, -0.40,  0.35, -0.32,  0.20, -0.32]);
  // Port opening
  gl.uniform4f(u_FragColor, 0.1, 0.1, 0.1, 1.0);
  drawTriangle([ 0.23, -0.41,  0.32, -0.41,  0.32, -0.36]);
  drawTriangle([ 0.23, -0.41,  0.32, -0.36,  0.23, -0.36]);

  // === Micro USB data port (bottom-right, next to power) ===
  gl.uniform4f(u_FragColor, 0.6, 0.6, 0.6, 1.0);
  drawTriangle([ 0.45, -0.40,  0.60, -0.40,  0.60, -0.32]);
  drawTriangle([ 0.45, -0.40,  0.60, -0.32,  0.45, -0.32]);
  gl.uniform4f(u_FragColor, 0.1, 0.1, 0.1, 1.0);
  drawTriangle([ 0.48, -0.41,  0.57, -0.41,  0.57, -0.36]);
  drawTriangle([ 0.48, -0.41,  0.57, -0.36,  0.48, -0.36]);

  // === CSI camera connector (bottom area, between HDMI and USB) ===
  gl.uniform4f(u_FragColor, 0.75, 0.70, 0.55, 1.0);
  drawTriangle([-0.20, -0.35,  0.05, -0.35,  0.05, -0.29]);
  drawTriangle([-0.20, -0.35,  0.05, -0.29, -0.20, -0.29]);
  // Connector latch
  gl.uniform4f(u_FragColor, 0.2, 0.2, 0.2, 1.0);
  drawTriangle([-0.18, -0.29,  0.03, -0.29,  0.03, -0.26]);
  drawTriangle([-0.18, -0.29,  0.03, -0.26, -0.18, -0.26]);

  // === MicroSD card slot (left edge) ===
  gl.uniform4f(u_FragColor, 0.5, 0.5, 0.5, 1.0);
  drawTriangle([-0.88, -0.12, -0.78, -0.12, -0.78,  0.12]);
  drawTriangle([-0.88, -0.12, -0.78,  0.12, -0.88,  0.12]);

  // === Small surface-mount components ===
  gl.uniform4f(u_FragColor, 0.3, 0.25, 0.15, 1.0);
  drawTriangle([-0.30, 0.10, -0.25, 0.10, -0.25, 0.13]);
  drawTriangle([-0.30, 0.10, -0.25, 0.13, -0.30, 0.13]);
  drawTriangle([ 0.25, 0.10,  0.30, 0.10,  0.30, 0.13]);
  drawTriangle([ 0.25, 0.10,  0.30, 0.13,  0.25, 0.13]);
  drawTriangle([ 0.35, -0.20,  0.40, -0.20,  0.40, -0.17]);
  drawTriangle([ 0.35, -0.20,  0.40, -0.17,  0.35, -0.17]);

  // === WiFi/BT antenna area (copper trace) ===
  gl.uniform4f(u_FragColor, 0.7, 0.55, 0.2, 1.0);
  drawTriangle([ 0.30, 0.15,  0.45, 0.15,  0.45, 0.25]);
  drawTriangle([ 0.30, 0.15,  0.45, 0.25,  0.30, 0.25]);

  // === Raspberry Pi logo (on the chip) ===
  gl.uniform4f(u_FragColor, 0.85, 0.10, 0.30, 1.0);
  drawTriangle([-0.03, -0.12,  0.03, -0.12,  0.00, -0.06]);
  drawTriangle([-0.04, -0.09,  0.04, -0.09,  0.00, -0.14]);
  // Leaf
  gl.uniform4f(u_FragColor, 0.0, 0.55, 0.15, 1.0);
  drawTriangle([ 0.00, -0.06,  0.03, -0.03, -0.03, -0.03]);
}

function renderAllShapes() {
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Set the active filter for the fragment shader
  gl.uniform1i(u_FilterType, g_selectedFilter);

  var len = g_shapesList.length;
  for (var i = 0; i < len; i++) {
    g_shapesList[i].render();
  }
}
