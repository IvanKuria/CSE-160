// Cylinder.js — capped cylinder along Y axis, radius 0.5, height 1 (centered).
// Generated once at startup with N radial segments.

var g_cylinderBuffer = null;
var g_cylinderVertexCount = 0;

// Written by Claude
function initCylinder(gl) {
  var N = 24;
  var r = 0.5;
  var hy = 0.5;       // half-height
  var verts = [];

  for (var i = 0; i < N; i++) {
    var a1 = (i     / N) * 2 * Math.PI;
    var a2 = ((i+1) / N) * 2 * Math.PI;
    var x1 = r * Math.cos(a1), z1 = r * Math.sin(a1);
    var x2 = r * Math.cos(a2), z2 = r * Math.sin(a2);

    // Side: two triangles per segment
    verts.push(x1,-hy,z1,  x2,-hy,z2,  x2, hy,z2);
    verts.push(x1,-hy,z1,  x2, hy,z2,  x1, hy,z1);

    // Top cap (fan to center [0, hy, 0])
    verts.push(0, hy, 0,   x1, hy, z1,  x2, hy, z2);

    // Bottom cap (fan to center [0,-hy, 0]) — reversed winding
    verts.push(0,-hy, 0,   x2,-hy, z2,  x1,-hy, z1);
  }

  var arr = new Float32Array(verts);
  g_cylinderVertexCount = verts.length / 3;
  g_cylinderBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cylinderBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
}

// Written by Claude
function drawCylinder(gl, M, color) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniform4fv(u_FragColor, color);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cylinderBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.drawArrays(gl.TRIANGLES, 0, g_cylinderVertexCount);
}
