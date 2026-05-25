// Cube.js — centered unit cube [-0.5, 0.5], now with per-face NORMALS.
// Interleaved layout: [x, y, z, nx, ny, nz] -> stride 24 bytes (6 floats * 4).
// Each face's normal is a constant axis direction, so we just repeat it for the
// 6 vertices of that face. These are the surface normals the Phong shader needs.

var g_cubeBuffer = null;
var g_cubeVertexCount = 36;

// claude wrote this
function initCube(gl) {
  // pos (3) + normal (3) per vertex; 6 faces * 6 verts
  var v = new Float32Array([
    // front (z = 0.5), normal (0,0,1)
    -0.5,-0.5, 0.5,  0,0,1,   0.5,-0.5, 0.5,  0,0,1,   0.5, 0.5, 0.5,  0,0,1,
    -0.5,-0.5, 0.5,  0,0,1,   0.5, 0.5, 0.5,  0,0,1,  -0.5, 0.5, 0.5,  0,0,1,
    // back (z = -0.5), normal (0,0,-1)
    -0.5,-0.5,-0.5,  0,0,-1,  0.5, 0.5,-0.5,  0,0,-1,  0.5,-0.5,-0.5,  0,0,-1,
    -0.5,-0.5,-0.5,  0,0,-1, -0.5, 0.5,-0.5,  0,0,-1,  0.5, 0.5,-0.5,  0,0,-1,
    // top (y = 0.5), normal (0,1,0)
    -0.5, 0.5,-0.5,  0,1,0,  -0.5, 0.5, 0.5,  0,1,0,   0.5, 0.5, 0.5,  0,1,0,
    -0.5, 0.5,-0.5,  0,1,0,   0.5, 0.5, 0.5,  0,1,0,   0.5, 0.5,-0.5,  0,1,0,
    // bottom (y = -0.5), normal (0,-1,0)
    -0.5,-0.5,-0.5,  0,-1,0,  0.5,-0.5,-0.5,  0,-1,0,  0.5,-0.5, 0.5,  0,-1,0,
    -0.5,-0.5,-0.5,  0,-1,0,  0.5,-0.5, 0.5,  0,-1,0, -0.5,-0.5, 0.5,  0,-1,0,
    // right (x = 0.5), normal (1,0,0)
     0.5,-0.5,-0.5,  1,0,0,   0.5, 0.5,-0.5,  1,0,0,   0.5, 0.5, 0.5,  1,0,0,
     0.5,-0.5,-0.5,  1,0,0,   0.5, 0.5, 0.5,  1,0,0,   0.5,-0.5, 0.5,  1,0,0,
    // left (x = -0.5), normal (-1,0,0)
    -0.5,-0.5,-0.5, -1,0,0,  -0.5, 0.5, 0.5, -1,0,0,  -0.5, 0.5,-0.5, -1,0,0,
    -0.5,-0.5,-0.5, -1,0,0,  -0.5,-0.5, 0.5, -1,0,0,  -0.5, 0.5, 0.5, -1,0,0,
  ]);
  g_cubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
}

// claude wrote this
function drawCube(gl, M, color) {
  setMatrices(gl, M);                 // sets u_ModelMatrix + u_NormalMatrix
  gl.uniform4fv(u_FragColor, color);
  bindPosNormal(gl, g_cubeBuffer);    // binds a_Position + a_Normal (stride 24)
  gl.drawArrays(gl.TRIANGLES, 0, g_cubeVertexCount);
}
