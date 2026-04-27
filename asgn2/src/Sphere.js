// Sphere.js — UV sphere generated once at startup. Used for the 3 humps.

var g_sphereBuffer = null;
var g_sphereVertexCount = 0;

// Written by Claude
function initSphere(gl) {
  var lat = 20;   // latitude divisions
  var lon = 28;   // longitude divisions
  var r = 0.5;    // radius — pre-scaled to match the cube's [-0.5, 0.5] convention
  var verts = [];

  for (var i = 0; i < lat; i++) {
    var theta1 = (i / lat) * Math.PI;
    var theta2 = ((i + 1) / lat) * Math.PI;
    for (var j = 0; j < lon; j++) {
      var phi1 = (j / lon) * 2 * Math.PI;
      var phi2 = ((j + 1) / lon) * 2 * Math.PI;

      var p1 = sph(r, theta1, phi1);
      var p2 = sph(r, theta2, phi1);
      var p3 = sph(r, theta2, phi2);
      var p4 = sph(r, theta1, phi2);

      // Two triangles per quad
      verts.push(p1[0],p1[1],p1[2], p2[0],p2[1],p2[2], p3[0],p3[1],p3[2]);
      verts.push(p1[0],p1[1],p1[2], p3[0],p3[1],p3[2], p4[0],p4[1],p4[2]);
    }
  }

  var arr = new Float32Array(verts);
  g_sphereVertexCount = verts.length / 3;
  g_sphereBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
}

// Written by Claude
function sph(r, theta, phi) {
  return [
    r * Math.sin(theta) * Math.cos(phi),
    r * Math.cos(theta),
    r * Math.sin(theta) * Math.sin(phi),
  ];
}

// Written by Claude
function drawSphere(gl, M, color) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniform4fv(u_FragColor, color);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, g_sphereVertexCount);
}
