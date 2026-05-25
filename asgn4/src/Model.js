// Model.js — minimal OBJ loader producing the same interleaved [pos3, normal3]
// buffer (stride 24) the primitives use, so it plugs straight into the Phong
// pipeline. Handles v / vn / f with v, v/vt, v/vt/vn, v//vn; triangulates
// polygons with a fan. If the file has no vn, smooth per-vertex normals are
// computed by summing incident face normals. Geometry is centered and scaled
// to ~unit size so drawModel can place it with a plain model matrix.

var g_modelBuffer = null;
var g_modelVertexCount = 0;
var g_modelReady = false;

// claude wrote this
function loadModel(gl, url, onLoaded) {
  fetch(url)
    .then(function (resp) {
      if (!resp.ok) throw new Error('HTTP ' + resp.status + ' for ' + url);
      return resp.text();
    })
    .then(function (text) {
      var interleaved = parseOBJ(text);
      g_modelVertexCount = interleaved.length / 6;
      g_modelBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, g_modelBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(interleaved), gl.STATIC_DRAW);
      g_modelReady = true;
      console.log('Loaded OBJ:', url, '(' + g_modelVertexCount + ' verts)');
      if (onLoaded) onLoaded();
    })
    .catch(function (err) {
      console.error('Failed to load OBJ:', err);
    });
}

// claude wrote this
function parseOBJ(text) {
  var positions = [];   // [[x,y,z], ...] indexed by v
  var normals = [];     // [[x,y,z], ...] indexed by vn
  var faces = [];       // [[ {v,vn}, {v,vn}, ... ], ...]

  var lines = text.split('\n');
  for (var li = 0; li < lines.length; li++) {
    var line = lines[li].trim();
    if (line.length === 0 || line[0] === '#') continue;
    var parts = line.split(/\s+/);
    var tag = parts[0];
    if (tag === 'v') {
      positions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (tag === 'vn') {
      normals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (tag === 'f') {
      var face = [];
      for (var k = 1; k < parts.length; k++) {
        var comps = parts[k].split('/');           // v, v/vt, v/vt/vn, v//vn
        var vi = parseInt(comps[0], 10);
        var ni = (comps.length === 3 && comps[2] !== '') ? parseInt(comps[2], 10) : NaN;
        // OBJ indices are 1-based and may be negative (relative)
        if (vi < 0) vi = positions.length + vi + 1;
        if (!isNaN(ni) && ni < 0) ni = normals.length + ni + 1;
        face.push({ v: vi - 1, n: isNaN(ni) ? -1 : ni - 1 });
      }
      faces.push(face);
    }
  }

  var haveNormals = normals.length > 0;

  // If no normals supplied, accumulate smooth per-vertex normals.
  var smooth = null;
  if (!haveNormals) {
    smooth = new Array(positions.length);
    for (var s = 0; s < smooth.length; s++) smooth[s] = [0, 0, 0];
    for (var f = 0; f < faces.length; f++) {
      var fc = faces[f];
      for (var t = 1; t + 1 < fc.length; t++) {          // fan triangles
        addFaceNormal(positions, smooth, fc[0].v, fc[t].v, fc[t + 1].v);
      }
    }
    for (var m = 0; m < smooth.length; m++) smooth[m] = norm3(smooth[m]);
  }

  // Center + uniform scale so the model fits roughly in [-0.5, 0.5].
  var lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (var p = 0; p < positions.length; p++) {
    for (var c = 0; c < 3; c++) {
      if (positions[p][c] < lo[c]) lo[c] = positions[p][c];
      if (positions[p][c] > hi[c]) hi[c] = positions[p][c];
    }
  }
  var center = [(lo[0]+hi[0])/2, (lo[1]+hi[1])/2, (lo[2]+hi[2])/2];
  var ext = Math.max(hi[0]-lo[0], hi[1]-lo[1], hi[2]-lo[2]) || 1;
  var scale = 1.0 / ext;

  // Emit interleaved triangles (fan-triangulated).
  var out = [];
  for (var fi = 0; fi < faces.length; fi++) {
    var face = faces[fi];
    for (var tt = 1; tt + 1 < face.length; tt++) {
      emitVert(out, face[0]);
      emitVert(out, face[tt]);
      emitVert(out, face[tt + 1]);
    }
  }
  return out;

  // claude wrote this
  function emitVert(out, corner) {
    var p = positions[corner.v];
    out.push((p[0]-center[0])*scale, (p[1]-center[1])*scale, (p[2]-center[2])*scale);
    var nrm;
    if (haveNormals && corner.n >= 0) nrm = norm3(normals[corner.n]);
    else if (smooth) nrm = smooth[corner.v];
    else nrm = [0, 1, 0];
    out.push(nrm[0], nrm[1], nrm[2]);
  }
}

// claude wrote this
function addFaceNormal(positions, acc, ia, ib, ic) {
  var a = positions[ia], b = positions[ib], c = positions[ic];
  var u = [b[0]-a[0], b[1]-a[1], b[2]-a[2]];
  var v = [c[0]-a[0], c[1]-a[1], c[2]-a[2]];
  var nx = u[1]*v[2] - u[2]*v[1];
  var ny = u[2]*v[0] - u[0]*v[2];
  var nz = u[0]*v[1] - u[1]*v[0];
  acc[ia][0]+=nx; acc[ia][1]+=ny; acc[ia][2]+=nz;
  acc[ib][0]+=nx; acc[ib][1]+=ny; acc[ib][2]+=nz;
  acc[ic][0]+=nx; acc[ic][1]+=ny; acc[ic][2]+=nz;
}

// claude wrote this
function norm3(a) {
  var m = Math.sqrt(a[0]*a[0] + a[1]*a[1] + a[2]*a[2]) || 1;
  return [a[0]/m, a[1]/m, a[2]/m];
}

// claude wrote this
function drawModel(gl, M, color) {
  if (!g_modelReady) return;
  setMatrices(gl, M);
  gl.uniform4fv(u_FragColor, color);
  bindPosNormal(gl, g_modelBuffer);
  gl.drawArrays(gl.TRIANGLES, 0, g_modelVertexCount);
}
