// Cube.js — interleaved position+UV buffer for a unit cube centered on origin.
// Used both for the sky cube (drawCube) and as the source faces World.js
// stitches into batched per-texture mega-buffers.

var g_cubeBuffer = null;
var g_cubeVertexCount = 36;

// 36 vertices, stride 5 floats (x,y,z,u,v). Range [-0.5, 0.5].
var CUBE_VERTS = new Float32Array([
  // front (+z)
  -0.5,-0.5, 0.5, 0,0,   0.5,-0.5, 0.5, 1,0,   0.5, 0.5, 0.5, 1,1,
  -0.5,-0.5, 0.5, 0,0,   0.5, 0.5, 0.5, 1,1,  -0.5, 0.5, 0.5, 0,1,
  // back (-z)
  -0.5,-0.5,-0.5, 1,0,   0.5, 0.5,-0.5, 0,1,   0.5,-0.5,-0.5, 0,0,
  -0.5,-0.5,-0.5, 1,0,  -0.5, 0.5,-0.5, 1,1,   0.5, 0.5,-0.5, 0,1,
  // top (+y)
  -0.5, 0.5,-0.5, 0,1,  -0.5, 0.5, 0.5, 0,0,   0.5, 0.5, 0.5, 1,0,
  -0.5, 0.5,-0.5, 0,1,   0.5, 0.5, 0.5, 1,0,   0.5, 0.5,-0.5, 1,1,
  // bottom (-y)
  -0.5,-0.5,-0.5, 0,0,   0.5,-0.5,-0.5, 1,0,   0.5,-0.5, 0.5, 1,1,
  -0.5,-0.5,-0.5, 0,0,   0.5,-0.5, 0.5, 1,1,  -0.5,-0.5, 0.5, 0,1,
  // right (+x)
   0.5,-0.5,-0.5, 1,0,   0.5, 0.5,-0.5, 1,1,   0.5, 0.5, 0.5, 0,1,
   0.5,-0.5,-0.5, 1,0,   0.5, 0.5, 0.5, 0,1,   0.5,-0.5, 0.5, 0,0,
  // left (-x)
  -0.5,-0.5,-0.5, 0,0,  -0.5, 0.5, 0.5, 1,1,  -0.5, 0.5,-0.5, 0,1,
  -0.5,-0.5,-0.5, 0,0,  -0.5,-0.5, 0.5, 1,0,  -0.5, 0.5, 0.5, 1,1,
]);

// claude wrote this
function initCube(gl) {
  g_cubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, CUBE_VERTS, gl.STATIC_DRAW);
}

// Per-face position+UV in object space [-0.5, 0.5]^3. World.js uses this to
// emit only the faces it needs (skipping faces hidden by neighbors).
// Order: 0=front +z, 1=back -z, 2=top +y, 3=bottom -y, 4=right +x, 5=left -x.
// claude wrote this
function cubeFace(faceIndex) {
  return CUBE_VERTS.subarray(faceIndex * 30, faceIndex * 30 + 30);
}

// Bind the shared cube buffer and set up the position/UV attrib pointers.
// Used for the sky cube and any one-off cube draws (e.g. jug pickups).
// claude wrote this
function bindCubeBuffer(gl, a_Position, a_UV) {
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 20, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 20, 12);
  gl.enableVertexAttribArray(a_UV);
}

// claude wrote this
function drawCube(gl, M) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.drawArrays(gl.TRIANGLES, 0, g_cubeVertexCount);
}
