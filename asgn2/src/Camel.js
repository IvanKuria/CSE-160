// Camel.js — high-detail 3-humped camel built from cubes, spheres, and cylinders.
// Uses sphere joints (knees, hips, shoulders, jaw hinge) and a curved 3-segment
// neck so the silhouette is properly curvy rather than blocky.

// === Color palette ===
var COL_BODY     = new Float32Array([0.82, 0.66, 0.42, 1.0]);
var COL_BELLY    = new Float32Array([0.96, 0.88, 0.70, 1.0]);
var COL_HUMP     = new Float32Array([0.55, 0.40, 0.22, 1.0]);
var COL_HUMP_TIP = new Float32Array([0.40, 0.28, 0.14, 1.0]);
var COL_LEG_UP   = new Float32Array([0.78, 0.62, 0.38, 1.0]);
var COL_LEG_LO   = new Float32Array([0.55, 0.40, 0.22, 1.0]);
var COL_JOINT    = new Float32Array([0.65, 0.50, 0.28, 1.0]);
var COL_FOOT     = new Float32Array([0.30, 0.22, 0.14, 1.0]);
var COL_TOE      = new Float32Array([0.18, 0.12, 0.08, 1.0]);
var COL_HEAD     = new Float32Array([0.85, 0.70, 0.46, 1.0]);
var COL_FOREHEAD = new Float32Array([0.70, 0.55, 0.32, 1.0]);
var COL_UPPER_J  = new Float32Array([0.78, 0.62, 0.38, 1.0]);
var COL_LOWER_J  = new Float32Array([0.92, 0.80, 0.58, 1.0]);
var COL_NOSTRIL  = new Float32Array([0.15, 0.10, 0.08, 1.0]);
var COL_EYE_W    = new Float32Array([0.96, 0.92, 0.85, 1.0]);
var COL_EYE      = new Float32Array([0.05, 0.05, 0.05, 1.0]);
var COL_TAIL     = new Float32Array([0.55, 0.40, 0.22, 1.0]);
var COL_TAIL_TUF = new Float32Array([0.20, 0.14, 0.08, 1.0]);

// Written by Claude
function renderCamel(gl) {
  // ===== BODY =====
  // Main barrel (cube) — with a sphere capping each end so the silhouette is rounded
  var body = new Matrix4().scale(0.9, 0.36, 0.42);
  drawCube(gl, body, COL_BODY);

  // Rounded shoulders/rump (spheres at body ends)
  drawSphere(gl, new Matrix4().translate( 0.42, 0.02, 0.0).scale(0.36, 0.40, 0.44), COL_BODY);
  drawSphere(gl, new Matrix4().translate(-0.42, 0.02, 0.0).scale(0.40, 0.42, 0.46), COL_BODY);

  // Belly (lighter cream stripe)
  drawSphere(gl, new Matrix4().translate(0.0, -0.10, 0.0).scale(0.92, 0.22, 0.40), COL_BELLY);

  // ===== THREE HUMPS =====
  var humpOffsets = [0, 0, 0];
  if (g_pokeMode) {
    for (var k = 0; k < 3; k++) humpOffsets[k] = 0.10 * Math.sin(g_seconds * 8 - k * 1.2);
  }
  var humpXs    = [-0.30, 0.00, 0.30];
  var humpSizes = [ 0.28, 0.34, 0.28];
  for (var i = 0; i < 3; i++) {
    var s = humpSizes[i];
    // Base hump (full sphere)
    drawSphere(gl,
      new Matrix4().translate(humpXs[i], 0.20 + humpOffsets[i], 0.0).scale(s, s * 1.0, s),
      COL_HUMP);
    // Darker tip cap
    drawSphere(gl,
      new Matrix4().translate(humpXs[i], 0.32 + humpOffsets[i], 0.0).scale(s*0.55, s*0.40, s*0.55),
      COL_HUMP_TIP);
  }

  // ===== CURVED NECK (3 segments — natural S-curve) =====
  // Each segment cumulatively adds part of the bend so the neck reads as a smooth arc.
  // Segment frame helpers — each returns a fresh Matrix4 already at the segment's tip.
  var bend = (g_neckAngle + g_neckBob) / 3;   // distribute the slider's bend across all 3 segments

  // Sphere at the body-neck junction (shoulder joint)
  drawSphere(gl, new Matrix4().translate(0.42, 0.18, 0.0).scale(0.20, 0.20, 0.20), COL_JOINT);

  // Segment 1 (lowest neck segment)
  var n1Pre = function() {
    return new Matrix4().translate(0.42, 0.18, 0.0).rotate(bend, 0, 0, 1);
  };
  drawCylinder(gl,
    n1Pre().translate(0.0, 0.10, 0.0).scale(0.18, 0.22, 0.18),
    COL_BODY);
  // Throat highlight on segment 1
  drawCylinder(gl,
    n1Pre().translate(0.04, 0.10, 0.0).scale(0.10, 0.20, 0.14),
    COL_BELLY);

  // Segment 2
  var n2Pre = function() {
    return n1Pre().translate(0.0, 0.20, 0.0).rotate(bend, 0, 0, 1);
  };
  drawSphere(gl, n2Pre().scale(0.18, 0.18, 0.18), COL_JOINT);
  drawCylinder(gl,
    n2Pre().translate(0.0, 0.10, 0.0).scale(0.16, 0.22, 0.16),
    COL_BODY);
  drawCylinder(gl,
    n2Pre().translate(0.04, 0.10, 0.0).scale(0.09, 0.20, 0.13),
    COL_BELLY);

  // Segment 3 (top of neck)
  var n3Pre = function() {
    return n2Pre().translate(0.0, 0.20, 0.0).rotate(bend, 0, 0, 1);
  };
  drawSphere(gl, n3Pre().scale(0.16, 0.16, 0.16), COL_JOINT);
  drawCylinder(gl,
    n3Pre().translate(0.0, 0.09, 0.0).scale(0.14, 0.20, 0.14),
    COL_BODY);

  // ===== HEAD (sphere skull, child of neck top) =====
  var headPre = function() {
    return n3Pre()
      .translate(0.0, 0.20, 0.0)
      .rotate(g_headAngle, 0, 0, 1);
  };
  // Skull (large sphere, slightly elongated)
  drawSphere(gl, headPre().scale(0.30, 0.26, 0.26), COL_HEAD);
  // Brow ridge (cube on top-front)
  drawCube(gl, headPre().translate(0.06, 0.10, 0.0).scale(0.22, 0.07, 0.28), COL_FOREHEAD);

  // Ears (cubes on top, slightly to the sides)
  for (var er = 0; er < 2; er++) {
    var ez = (er === 0) ? 0.12 : -0.12;
    drawCube(gl, headPre().translate(-0.02, 0.14, ez).scale(0.06, 0.08, 0.05), COL_FOREHEAD);
    drawCube(gl, headPre().translate(-0.01, 0.14, ez).scale(0.04, 0.06, 0.03), COL_BELLY);
  }

  // Eyes — sphere whites with sphere pupils
  for (var ex = 0; ex < 2; ex++) {
    var z = (ex === 0) ? 0.16 : -0.16;
    drawSphere(gl, headPre().translate(0.08, 0.05, z * 0.85).scale(0.07, 0.07, 0.07), COL_EYE_W);
    drawSphere(gl, headPre().translate(0.11, 0.05, z * 0.85).scale(0.035, 0.035, 0.035), COL_EYE);
  }

  // ===== UPPER SNOUT (3rd-level joint) — ellipsoid =====
  var snoutPre = function() {
    return headPre()
      .translate(0.18, -0.04, 0.0)
      .rotate(g_snoutAngle, 0, 0, 1);
  };
  drawSphere(gl, snoutPre().translate(0.10, 0.02, 0.0).scale(0.26, 0.14, 0.20), COL_UPPER_J);

  // Nostrils (small dark spheres on the front of the muzzle)
  for (var n = 0; n < 2; n++) {
    var nz = (n === 0) ? 0.05 : -0.05;
    drawSphere(gl, snoutPre().translate(0.22, 0.04, nz).scale(0.025, 0.035, 0.030), COL_NOSTRIL);
  }

  // ===== LOWER JAW (4th-level joint — chomps during poke) =====
  var jawOpen = 0;
  if (g_pokeMode) jawOpen = 18 + 12 * Math.sin(g_seconds * 16);
  var lowerJaw = snoutPre()
    .translate(0.0, -0.02, 0.0)
    .rotate(-jawOpen, 0, 0, 1)
    .translate(0.10, -0.05, 0.0);
  drawSphere(gl, new Matrix4(lowerJaw).scale(0.22, 0.08, 0.18), COL_LOWER_J);

  // ===== LEGS — cylinders + sphere joints + foot pads =====
  var hipPositions = [
    [ 0.30, -0.16,  0.20, 'front'],
    [ 0.30, -0.16, -0.20, 'front'],
    [-0.30, -0.16,  0.20, 'back' ],
    [-0.30, -0.16, -0.20, 'back' ],
  ];
  for (var L = 0; L < 4; L++) {
    var hp = hipPositions[L];
    var swing = (hp[3] === 'front') ? g_frontLegAngle : g_backLegAngle;
    if (L % 2 === 1) swing = -swing;

    // Hip / shoulder ball joint
    drawSphere(gl,
      new Matrix4().translate(hp[0], hp[1], hp[2]).scale(0.16, 0.16, 0.16),
      COL_JOINT);

    // Thigh (cylinder)
    var thighPre = new Matrix4()
      .translate(hp[0], hp[1], hp[2])
      .rotate(swing, 0, 0, 1);
    drawCylinder(gl,
      new Matrix4(thighPre).translate(0.0, -0.18, 0.0).scale(0.12, 0.36, 0.12),
      COL_LEG_UP);

    // Knee joint (sphere)
    var kneePos = new Matrix4(thighPre).translate(0.0, -0.36, 0.0);
    drawSphere(gl, new Matrix4(kneePos).scale(0.13, 0.13, 0.13), COL_JOINT);

    // Shin (cylinder, after knee bend)
    var kneeBend = -Math.abs(swing) * 0.4;
    var shinPre = new Matrix4(kneePos).rotate(kneeBend, 0, 0, 1);
    drawCylinder(gl,
      new Matrix4(shinPre).translate(0.0, -0.16, 0.0).scale(0.10, 0.32, 0.10),
      COL_LEG_LO);

    // Ankle joint (sphere)
    var anklePos = new Matrix4(shinPre).translate(0.0, -0.32, 0.0);
    drawSphere(gl, new Matrix4(anklePos).scale(0.11, 0.11, 0.11), COL_JOINT);

    // Foot pad (counter-rotated to stay flat) — flattened sphere
    var footFlat = new Matrix4(anklePos)
      .rotate(-(swing + kneeBend), 0, 0, 1)
      .translate(0.02, -0.04, 0.0);
    drawSphere(gl, new Matrix4(footFlat).scale(0.20, 0.06, 0.18), COL_FOOT);

    // Two toe pads at the front of the foot
    for (var t = 0; t < 2; t++) {
      var tz = (t === 0) ? 0.045 : -0.045;
      drawSphere(gl,
        new Matrix4(footFlat).translate(0.07, -0.005, tz).scale(0.05, 0.04, 0.05),
        COL_TOE);
    }
  }

  // ===== TAIL (3-deep chain, cylinder segments, sphere tuft) =====
  var tailPre = function() {
    return new Matrix4().translate(-0.45, 0.10, 0.0).rotate(g_tailAngle, 0, 0, 1);
  };
  // Segment 1
  drawCylinder(gl, tailPre().rotate(-90, 0, 0, 1).translate(0.0, 0.06, 0.0).scale(0.06, 0.14, 0.06), COL_TAIL);

  // Segment 2
  var tail2Pre = function() {
    return tailPre()
      .translate(-0.13, 0.0, 0.0)
      .rotate(g_tailAngle * 1.5, 0, 0, 1);
  };
  drawCylinder(gl, tail2Pre().rotate(-90, 0, 0, 1).translate(0.0, 0.05, 0.0).scale(0.05, 0.12, 0.05), COL_TAIL);

  // Segment 3
  var tail3Pre = function() {
    return tail2Pre()
      .translate(-0.11, 0.0, 0.0)
      .rotate(g_tailAngle * 2.0, 0, 0, 1);
  };
  drawCylinder(gl, tail3Pre().rotate(-90, 0, 0, 1).translate(0.0, 0.04, 0.0).scale(0.04, 0.10, 0.04), COL_TAIL);

  // Tail tuft — cluster of small spheres at the tip
  var tuftBase = tail3Pre().translate(-0.10, 0.0, 0.0);
  drawSphere(gl, new Matrix4(tuftBase).scale(0.07, 0.07, 0.07), COL_TAIL_TUF);
  drawSphere(gl, new Matrix4(tuftBase).translate(-0.04, 0.03, 0.02).scale(0.05, 0.05, 0.05), COL_TAIL_TUF);
  drawSphere(gl, new Matrix4(tuftBase).translate(-0.04, -0.02,-0.02).scale(0.05, 0.05, 0.05), COL_TAIL_TUF);
  drawSphere(gl, new Matrix4(tuftBase).translate(-0.05, 0.01, -0.03).scale(0.04, 0.04, 0.04), COL_TAIL_TUF);
}
