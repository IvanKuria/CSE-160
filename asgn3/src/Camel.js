// Camel.js — cube-only 3-humped camel that lives in the voxel world.
// Drawn using the shared cube buffer + solid color (u_texColorWeight = 0).
// Position is updated by World logic in asgn3.js; this file only draws.

var g_camelLegPhase = 0;

// claude wrote this
function drawCamelCube(gl, M, color) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniform4fv(u_baseColor, color);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

// world(x,y,z) is the camel's "feet center" position in world coordinates;
// `facing` is the yaw in degrees (0 = facing +x).
// claude wrote this
function renderCamel(gl, x, y, z, facing) {
  // Switch shader to solid-color mode and ensure the cube buffer is bound.
  gl.uniform1f(u_texColorWeight, 0.0);
  bindCubeBuffer(gl, a_Position, a_UV);

  const root = new Matrix4().translate(x, y, z).rotate(facing, 0, 1, 0);

  // BODY — long sand-colored barrel
  const COL_BODY = new Float32Array([0.80, 0.65, 0.40, 1]);
  const COL_DARK = new Float32Array([0.50, 0.35, 0.20, 1]);
  const COL_HUMP = new Float32Array([0.45, 0.30, 0.15, 1]);
  const COL_HEAD = new Float32Array([0.85, 0.70, 0.46, 1]);

  drawCamelCube(gl, new Matrix4(root).translate(0, 0.85, 0).scale(1.2, 0.55, 0.55), COL_BODY);

  // 3 HUMPS along the back
  drawCamelCube(gl, new Matrix4(root).translate(-0.40, 1.30, 0).scale(0.35, 0.35, 0.45), COL_HUMP);
  drawCamelCube(gl, new Matrix4(root).translate( 0.00, 1.32, 0).scale(0.42, 0.40, 0.50), COL_HUMP);
  drawCamelCube(gl, new Matrix4(root).translate( 0.40, 1.30, 0).scale(0.35, 0.35, 0.45), COL_HUMP);

  // NECK — angled cube
  drawCamelCube(gl, new Matrix4(root).translate(0.55, 1.30, 0).rotate(-30, 0, 0, 1).scale(0.30, 0.70, 0.32), COL_BODY);

  // HEAD
  drawCamelCube(gl, new Matrix4(root).translate(0.95, 1.65, 0).scale(0.30, 0.30, 0.30), COL_HEAD);
  // SNOUT
  drawCamelCube(gl, new Matrix4(root).translate(1.13, 1.58, 0).scale(0.20, 0.18, 0.22), COL_HEAD);
  // EARS — two small dark cubes on top of the head
  drawCamelCube(gl, new Matrix4(root).translate(0.92, 1.85, 0.10).scale(0.05, 0.10, 0.05), COL_DARK);
  drawCamelCube(gl, new Matrix4(root).translate(0.92, 1.85,-0.10).scale(0.05, 0.10, 0.05), COL_DARK);
  // EYES
  drawCamelCube(gl, new Matrix4(root).translate(1.05, 1.70, 0.14).scale(0.04, 0.04, 0.04), COL_DARK);
  drawCamelCube(gl, new Matrix4(root).translate(1.05, 1.70,-0.14).scale(0.04, 0.04, 0.04), COL_DARK);

  // LEGS — animated swing while the camel walks
  const swing = 25 * Math.sin(g_camelLegPhase);
  const hips = [
    [ 0.45,  0.22,  swing],   // front right
    [ 0.45, -0.22, -swing],   // front left
    [-0.45,  0.22, -swing],   // back right
    [-0.45, -0.22,  swing],   // back left
  ];
  for (const [hx, hz, sw] of hips) {
    const leg = new Matrix4(root)
      .translate(hx, 0.55, hz)
      .rotate(sw, 0, 0, 1)
      .translate(0, -0.30, 0)
      .scale(0.16, 0.60, 0.16);
    drawCamelCube(gl, leg, COL_DARK);
  }

  // TAIL
  drawCamelCube(gl, new Matrix4(root).translate(-0.65, 1.00, 0).scale(0.12, 0.40, 0.12), COL_DARK);

  // restore default rendering state for subsequent draws
  gl.uniform1f(u_texColorWeight, 1.0);
}
