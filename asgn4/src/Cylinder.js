// Cylinder.js — capped cylinder along Y, radius 0.5, height 1 (centered), with NORMALS.
// Side normals point radially outward (cos a, 0, sin a); the top/bottom caps use
// (0, +/-1, 0). Interleaved layout: [x, y, z, nx, ny, nz] -> stride 24 bytes.

var g_cylinderBuffer = null;
var g_cylinderVertexCount = 0;

// claude wrote this
function initCylinder(gl) {
  var N = 32;
  var r = 0.5;
  var hy = 0.5;       // half-height
  var verts = [];

  // claude wrote this
  function v(x, y, z, nx, ny, nz) { verts.push(x, y, z, nx, ny, nz); }

  for (var i = 0; i < N; i++) {
    var a1 = (i     / N) * 2 * Math.PI;
    var a2 = ((i+1) / N) * 2 * Math.PI;
    var c1 = Math.cos(a1), s1 = Math.sin(a1);
    var c2 = Math.cos(a2), s2 = Math.sin(a2);
    var x1 = r * c1, z1 = r * s1;
    var x2 = r * c2, z2 = r * s2;

    // Side: two triangles per segment, radial normals
    v(x1,-hy,z1, c1,0,s1);  v(x2,-hy,z2, c2,0,s2);  v(x2, hy,z2, c2,0,s2);
    v(x1,-hy,z1, c1,0,s1);  v(x2, hy,z2, c2,0,s2);  v(x1, hy,z1, c1,0,s1);

    // Top cap (fan to center), normal +Y
    v(0, hy, 0, 0,1,0);   v(x1, hy, z1, 0,1,0);  v(x2, hy, z2, 0,1,0);

    // Bottom cap (fan to center, reversed winding), normal -Y
    v(0,-hy, 0, 0,-1,0);  v(x2,-hy, z2, 0,-1,0); v(x1,-hy, z1, 0,-1,0);
  }

  var arr = new Float32Array(verts);
  g_cylinderVertexCount = verts.length / 6;
  g_cylinderBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cylinderBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
}

// claude wrote this
function drawCylinder(gl, M, color) {
  setMatrices(gl, M);
  gl.uniform4fv(u_FragColor, color);
  bindPosNormal(gl, g_cylinderBuffer);
  gl.drawArrays(gl.TRIANGLES, 0, g_cylinderVertexCount);
}
