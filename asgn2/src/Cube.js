// Cube.js — single cached cube buffer (unit cube from 0..1 on each axis)
// Centered cube would also work; we use 0..1 so translate-then-scale places
// the cube's "anchor" at the origin corner, which makes joint placement easier.

var g_cubeBuffer = null;
var g_cubeVertexCount = 36;

// Written by Claude
function initCube(gl) {
  // 12 triangles, 36 vertices, range [-0.5, 0.5] so the cube is centered on origin
  var v = new Float32Array([
    // front (z = 0.5)
    -0.5,-0.5, 0.5,   0.5,-0.5, 0.5,   0.5, 0.5, 0.5,
    -0.5,-0.5, 0.5,   0.5, 0.5, 0.5,  -0.5, 0.5, 0.5,
    // back (z = -0.5)
    -0.5,-0.5,-0.5,   0.5, 0.5,-0.5,   0.5,-0.5,-0.5,
    -0.5,-0.5,-0.5,  -0.5, 0.5,-0.5,   0.5, 0.5,-0.5,
    // top (y = 0.5)
    -0.5, 0.5,-0.5,  -0.5, 0.5, 0.5,   0.5, 0.5, 0.5,
    -0.5, 0.5,-0.5,   0.5, 0.5, 0.5,   0.5, 0.5,-0.5,
    // bottom (y = -0.5)
    -0.5,-0.5,-0.5,   0.5,-0.5,-0.5,   0.5,-0.5, 0.5,
    -0.5,-0.5,-0.5,   0.5,-0.5, 0.5,  -0.5,-0.5, 0.5,
    // right (x = 0.5)
     0.5,-0.5,-0.5,   0.5, 0.5,-0.5,   0.5, 0.5, 0.5,
     0.5,-0.5,-0.5,   0.5, 0.5, 0.5,   0.5,-0.5, 0.5,
    // left (x = -0.5)
    -0.5,-0.5,-0.5,  -0.5, 0.5, 0.5,  -0.5, 0.5,-0.5,
    -0.5,-0.5,-0.5,  -0.5,-0.5, 0.5,  -0.5, 0.5, 0.5,
  ]);
  g_cubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
}

// Written by Claude
function drawCube(gl, M, color) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniform4fv(u_FragColor, color);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, g_cubeVertexCount);
}
