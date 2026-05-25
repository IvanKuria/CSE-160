// Sphere.js — UV sphere generated once at startup, now with NORMALS.
// Because the sphere is centered on the origin, the outward normal at any
// vertex is simply the normalized position. We build at radius 1 so the unit
// position IS the normal, then store position scaled to r afterwards.
// Interleaved layout: [x, y, z, nx, ny, nz] -> stride 24 bytes.

var g_sphereBuffer = null;
var g_sphereVertexCount = 0;

// claude wrote this
function initSphere(gl) {
  var lat = 24;   // latitude divisions
  var lon = 32;   // longitude divisions
  var r = 0.5;    // radius — matches the cube's [-0.5, 0.5] convention
  var verts = [];

  // claude wrote this
  function push(theta, phi) {
    // unit direction = normal; position = r * direction
    var nx = Math.sin(theta) * Math.cos(phi);
    var ny = Math.cos(theta);
    var nz = Math.sin(theta) * Math.sin(phi);
    verts.push(r * nx, r * ny, r * nz, nx, ny, nz);
  }

  for (var i = 0; i < lat; i++) {
    var theta1 = (i / lat) * Math.PI;
    var theta2 = ((i + 1) / lat) * Math.PI;
    for (var j = 0; j < lon; j++) {
      var phi1 = (j / lon) * 2 * Math.PI;
      var phi2 = ((j + 1) / lon) * 2 * Math.PI;
      // two triangles per quad (same winding as asgn2)
      push(theta1, phi1); push(theta2, phi1); push(theta2, phi2);
      push(theta1, phi1); push(theta2, phi2); push(theta1, phi2);
    }
  }

  var arr = new Float32Array(verts);
  g_sphereVertexCount = verts.length / 6;
  g_sphereBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
}

// claude wrote this
function drawSphere(gl, M, color) {
  setMatrices(gl, M);
  gl.uniform4fv(u_FragColor, color);
  bindPosNormal(gl, g_sphereBuffer);
  gl.drawArrays(gl.TRIANGLES, 0, g_sphereVertexCount);
}
