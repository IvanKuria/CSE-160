// World.js — 32×32 voxel world built into a small number of batched buffers.
//
// The performance trick: instead of N×N×height drawCube() calls (thousands of
// gl.drawArrays per frame), we walk the map ONCE and emit only the visible
// cube faces into a per-texture interleaved Float32Array of [x,y,z,u,v].
// Rendering the world is then one bindBuffer + one drawArrays per texture.
// Edits (add/remove block) just flip the `dirty` flag → next frame rebuilds.

const MAP_SIZE = 64;
const TEX_SAND   = 0;
const TEX_STONE  = 1;
const TEX_PALM   = 2;
const TEX_WATER  = 3;
const TEX_GROUND = 4;
const TEX_SKY    = 5;

// Map cell value: 0..4 = sand wall of that height. 10 = stone tower (any height
// stored separately in `g_stoneHeight`). 20 = palm tree (single tall block).
// 30 = water jug pickup. We keep height in a parallel array so the cell value
// can stay a small int.
let g_map = null;        // Uint8Array(MAP_SIZE*MAP_SIZE), wall heights 0..4
let g_kind = null;       // Uint8Array, TEX_* per cell (defaults to TEX_SAND)
let g_terrain = null;    // Float32Array((MAP_SIZE+1)^2), ground y-heights
let g_worldDirty = true;

const TEX_GROUPS = [TEX_SAND, TEX_STONE, TEX_PALM, TEX_WATER]; // wall textures
const g_wallBuffers = {};    // tex → { buffer, vertCount }
let g_groundBuffer = null;
let g_groundVerts  = 0;

// claude wrote this
function initWorld() {
  g_map  = new Uint8Array(MAP_SIZE * MAP_SIZE);
  g_kind = new Uint8Array(MAP_SIZE * MAP_SIZE);

  // 1. Boundary wall — stone, 4 high
  for (let i = 0; i < MAP_SIZE; i++) {
    setCell(i, 0,            4, TEX_STONE);
    setCell(i, MAP_SIZE - 1, 4, TEX_STONE);
    setCell(0, i,            4, TEX_STONE);
    setCell(MAP_SIZE - 1, i, 4, TEX_STONE);
  }

  // 2. BIG STEPPED PYRAMID in the NW quadrant — 11×11 footprint stepping up to 4.
  // Each ring is a hollow square so you can knock a wall in and walk inside.
  const pCx = 14, pCz = 14;
  for (let r = 5; r >= 0; r--) {
    const h = Math.min(4, 6 - r);  // outer rings shortest, apex tallest
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) === r) {
          setCell(pCx + dx, pCz + dz, h, TEX_STONE);
        }
      }
    }
  }
  setCell(pCx, pCz, 4, TEX_STONE);

  // 3. SECOND, SMALLER PYRAMID south-west of the big one (a "tomb")
  const tCx = 30, tCz = 10;
  for (let r = 2; r >= 0; r--) {
    const h = 3 - r;
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++)
        if (Math.max(Math.abs(dx), Math.abs(dz)) === r)
          setCell(tCx + dx, tCz + dz, h, TEX_STONE);
  }
  setCell(tCx, tCz, 3, TEX_STONE);

  // 4. VILLAGE in the NE quadrant — 6 hollow huts (4×4) with doorways.
  const huts = [
    [42, 8], [48, 9], [54, 8],
    [42, 14], [49, 15], [55, 14],
  ];
  for (const [hx, hz] of huts) {
    for (let dx = 0; dx < 4; dx++) {
      for (let dz = 0; dz < 4; dz++) {
        const edge = (dx === 0 || dx === 3 || dz === 0 || dz === 3);
        if (!edge) continue;
        if (dz === 0 && dx === 1) continue;        // south doorway
        setCell(hx + dx, hz + dz, 2, TEX_SAND);
      }
    }
  }

  // 5. RUINED WALL — a long curving line of broken sandstone, like an old aqueduct
  for (let i = 0; i < 20; i++) {
    const wx = 22 + i, wz = 30 + Math.floor(Math.sin(i * 0.4) * 3);
    const h = (i % 4 === 0) ? 3 : (i % 3 === 0 ? 2 : 1);
    setCell(wx, wz, h, TEX_STONE);
  }

  // 6. SCATTERED COLUMNS (sand) — varied heights
  const pillars = [
    [6, 32, 4],  [8, 34, 2],  [10, 36, 3], [7, 38, 1],  [12, 40, 4],
    [4, 44, 2],  [8, 46, 3],  [12, 48, 4], [6, 50, 2],  [10, 52, 1],
    [4, 54, 3],  [8, 58, 2],
    [22, 22, 3], [26, 24, 2], [30, 26, 4], [34, 28, 2],
    [38, 32, 3], [42, 30, 4], [46, 34, 2], [50, 28, 3],
    [22, 44, 2], [26, 48, 3], [30, 52, 4], [34, 56, 2],
    [40, 44, 3], [44, 48, 2], [48, 52, 4], [52, 48, 3],
  ];
  for (const [x, z, h] of pillars) setCell(x, z, h, TEX_SAND);

  // 7. DUNE CLUSTERS — random low sand cubes for texture variety
  const seed = (i) => ((i * 9301 + 49297) % 233280) / 233280;
  let dn = 0;
  const duneCenters = [
    [20, 36], [28, 40], [36, 44], [44, 40], [52, 38],
    [8, 26], [12, 22], [18, 50], [42, 54], [50, 24],
    [56, 30], [56, 44], [38, 8], [10, 18],
  ];
  for (const [cx, cz] of duneCenters) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (seed(dn++) > 0.55) continue;
        const dist = Math.abs(dx) + Math.abs(dz);
        const h = dist === 0 ? 2 : (dist === 1 ? 1 : 1);
        if (!g_map[idx(cx + dx, cz + dz)]) setCell(cx + dx, cz + dz, h, TEX_SAND);
      }
    }
  }

  // 8. OASIS — big 7×7 water patch in the SE far corner (long journey for the camel)
  const oCx = 55, oCz = 55;
  for (let x = oCx - 3; x <= oCx + 3; x++)
    for (let z = oCz - 3; z <= oCz + 3; z++)
      if (inBounds(x, z) && !(g_map[idx(x, z)])) setCell(x, z, 1, TEX_WATER);

  // 9. PALMS around the oasis
  const palms = [
    [oCx - 4, oCz - 4], [oCx - 4, oCz],     [oCx - 4, oCz + 4],
    [oCx,     oCz - 4],                     [oCx,     oCz + 4],
    [oCx + 4, oCz - 4], [oCx + 4, oCz],     [oCx + 4, oCz + 4],
    [oCx - 5, oCz - 2], [oCx + 5, oCz + 2],
  ];
  for (const [x, z] of palms) if (inBounds(x, z)) setCell(x, z, 3, TEX_PALM);

  // 10. Three jug pickups well-spaced along the route
  setCell(10, 30, 1, TEX_WATER);
  setCell(28, 38, 1, TEX_WATER);
  setCell(46, 46, 1, TEX_WATER);

  // 11. Terrain heightmap — taller rolling dunes via summed sines.
  g_terrain = new Float32Array((MAP_SIZE + 1) * (MAP_SIZE + 1));
  for (let z = 0; z <= MAP_SIZE; z++) {
    for (let x = 0; x <= MAP_SIZE; x++) {
      const h = 0.80 * Math.sin(x * 0.25) * Math.cos(z * 0.22)
              + 0.50 * Math.sin(x * 0.13 + z * 0.18)
              + 0.30 * Math.cos(z * 0.42 + x * 0.08);
      g_terrain[z * (MAP_SIZE + 1) + x] = h;
    }
  }
}

// BFS pathfinder used by the camel AI. Returns an array of [x, z] cell centers
// from `start` to `goal`, or null if no path exists. Walls of any height block;
// water cells are passable (camel can wade through the oasis).
// claude wrote this
function findPath(sx, sz, gx, gz) {
  sx = Math.max(0, Math.min(MAP_SIZE - 1, sx | 0));
  sz = Math.max(0, Math.min(MAP_SIZE - 1, sz | 0));
  gx = Math.max(0, Math.min(MAP_SIZE - 1, gx | 0));
  gz = Math.max(0, Math.min(MAP_SIZE - 1, gz | 0));
  const passable = (x, z) => {
    if (!inBounds(x, z)) return false;
    if (g_map[idx(x, z)] === 0) return true;
    return g_kind[idx(x, z)] === TEX_WATER;
  };
  if (!passable(sx, sz) || !passable(gx, gz)) return null;
  const prev = new Int32Array(MAP_SIZE * MAP_SIZE).fill(-1);
  const visited = new Uint8Array(MAP_SIZE * MAP_SIZE);
  const queue = [sz * MAP_SIZE + sx];
  visited[sz * MAP_SIZE + sx] = 1;
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const cx = cur % MAP_SIZE, cz = (cur / MAP_SIZE) | 0;
    if (cx === gx && cz === gz) {
      // Reconstruct
      const path = [];
      let n = cur;
      while (n !== -1) {
        path.push([n % MAP_SIZE + 0.5, ((n / MAP_SIZE) | 0) + 0.5]);
        n = prev[n];
      }
      return path.reverse();
    }
    const ns = [[cx+1,cz],[cx-1,cz],[cx,cz+1],[cx,cz-1]];
    for (const [nx, nz] of ns) {
      const ni = nz * MAP_SIZE + nx;
      if (!passable(nx, nz) || visited[ni]) continue;
      visited[ni] = 1;
      prev[ni] = cur;
      queue.push(ni);
    }
  }
  return null;
}

// claude wrote this
function idx(x, z) { return z * MAP_SIZE + x; }
// claude wrote this
function inBounds(x, z) { return x >= 0 && x < MAP_SIZE && z >= 0 && z < MAP_SIZE; }
// claude wrote this
function setCell(x, z, h, kind) {
  if (!inBounds(x, z)) return;
  g_map[idx(x, z)] = h;
  g_kind[idx(x, z)] = kind;
  g_worldDirty = true;
}
// claude wrote this
function getCell(x, z) {
  if (!inBounds(x, z)) return { h: 0, kind: TEX_SAND };
  return { h: g_map[idx(x, z)], kind: g_kind[idx(x, z)] };
}

// Sample terrain ground height (bilinear) at world position (x, z) in cells.
// claude wrote this
function terrainAt(x, z) {
  if (!g_terrain) return 0;
  const stride = MAP_SIZE + 1;
  let xi = Math.max(0, Math.min(MAP_SIZE - 0.001, x));
  let zi = Math.max(0, Math.min(MAP_SIZE - 0.001, z));
  const x0 = Math.floor(xi), z0 = Math.floor(zi);
  const fx = xi - x0, fz = zi - z0;
  const h00 = g_terrain[z0 * stride + x0];
  const h10 = g_terrain[z0 * stride + x0 + 1];
  const h01 = g_terrain[(z0 + 1) * stride + x0];
  const h11 = g_terrain[(z0 + 1) * stride + x0 + 1];
  return h00 * (1 - fx) * (1 - fz) + h10 * fx * (1 - fz)
       + h01 * (1 - fx) * fz       + h11 * fx * fz;
}

// Emit one cube face's 6 verts into `out` at offset `o`, translated by (cx,cy,cz).
// Cube source faces are unit cubes centered on origin; we offset to put the
// cube's center at (cx + 0.5, cy + 0.5, cz + 0.5) — so cell (x, z) at height h
// occupies x..x+1, h..h+1, z..z+1.
// claude wrote this
function emitFace(out, o, face, cx, cy, cz) {
  const src = cubeFace(face);
  for (let i = 0; i < 6; i++) {
    out[o++] = src[i*5+0] + cx + 0.5;
    out[o++] = src[i*5+1] + cy + 0.5;
    out[o++] = src[i*5+2] + cz + 0.5;
    out[o++] = src[i*5+3];
    out[o++] = src[i*5+4];
  }
  return o;
}

// Decide whether neighbor (nx,nz) at vertical layer y hides our face.
// Returns true if the neighbor cell has a block at that layer (so we skip).
// claude wrote this
function hidden(nx, nz, y) {
  if (!inBounds(nx, nz)) return false;
  return g_map[idx(nx, nz)] > y;
}

// claude wrote this
function rebuildWorldGeometry(gl) {
  // Group wall faces by texture, accumulating into per-texture arrays.
  // First pass: count faces per texture so we can allocate exact-sized buffers.
  const counts = { [TEX_SAND]: 0, [TEX_STONE]: 0, [TEX_PALM]: 0, [TEX_WATER]: 0 };
  for (let z = 0; z < MAP_SIZE; z++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const h = g_map[idx(x, z)];
      if (!h) continue;
      const k = g_kind[idx(x, z)];
      for (let y = 0; y < h; y++) {
        // top exposed if no block above
        if (y === h - 1) counts[k]++;
        // bottom only exposed at y=0 (against ground) — skip; cull saves draws
        if (y === 0) counts[k]++;
        if (!hidden(x, z - 1, y)) counts[k]++; // back -z
        if (!hidden(x, z + 1, y)) counts[k]++; // front +z
        if (!hidden(x - 1, z, y)) counts[k]++; // left -x
        if (!hidden(x + 1, z, y)) counts[k]++; // right +x
      }
    }
  }

  const arrays = {};
  const offs = {};
  for (const k of TEX_GROUPS) {
    arrays[k] = new Float32Array(counts[k] * 6 * 5);
    offs[k] = 0;
  }

  // Second pass: emit faces
  for (let z = 0; z < MAP_SIZE; z++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const h = g_map[idx(x, z)];
      if (!h) continue;
      const k = g_kind[idx(x, z)];
      const arr = arrays[k];
      for (let y = 0; y < h; y++) {
        if (y === h - 1)         offs[k] = emitFace(arr, offs[k], 2, x, y, z); // top
        if (y === 0)             offs[k] = emitFace(arr, offs[k], 3, x, y, z); // bottom
        if (!hidden(x, z - 1, y)) offs[k] = emitFace(arr, offs[k], 1, x, y, z); // back
        if (!hidden(x, z + 1, y)) offs[k] = emitFace(arr, offs[k], 0, x, y, z); // front
        if (!hidden(x - 1, z, y)) offs[k] = emitFace(arr, offs[k], 5, x, y, z); // left
        if (!hidden(x + 1, z, y)) offs[k] = emitFace(arr, offs[k], 4, x, y, z); // right
      }
    }
  }

  // Upload to GL
  for (const k of TEX_GROUPS) {
    if (!g_wallBuffers[k]) g_wallBuffers[k] = { buffer: gl.createBuffer(), vertCount: 0 };
    gl.bindBuffer(gl.ARRAY_BUFFER, g_wallBuffers[k].buffer);
    gl.bufferData(gl.ARRAY_BUFFER, arrays[k], gl.STATIC_DRAW);
    g_wallBuffers[k].vertCount = counts[k] * 6;
  }

  // Ground: one quad (two triangles) per cell, sampling terrain at the 4 corners.
  // Built once and reused — terrain doesn't change.
  if (!g_groundBuffer) {
    const stride = MAP_SIZE + 1;
    const verts = new Float32Array(MAP_SIZE * MAP_SIZE * 6 * 5);
    let o = 0;
    for (let z = 0; z < MAP_SIZE; z++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const y00 = g_terrain[z * stride + x];
        const y10 = g_terrain[z * stride + x + 1];
        const y01 = g_terrain[(z+1) * stride + x];
        const y11 = g_terrain[(z+1) * stride + x + 1];
        // tile UV repeats every cell so the ground texture tiles densely
        // tri 1
        verts[o++] = x;   verts[o++] = y00; verts[o++] = z;   verts[o++] = 0; verts[o++] = 0;
        verts[o++] = x+1; verts[o++] = y10; verts[o++] = z;   verts[o++] = 1; verts[o++] = 0;
        verts[o++] = x+1; verts[o++] = y11; verts[o++] = z+1; verts[o++] = 1; verts[o++] = 1;
        // tri 2
        verts[o++] = x;   verts[o++] = y00; verts[o++] = z;   verts[o++] = 0; verts[o++] = 0;
        verts[o++] = x+1; verts[o++] = y11; verts[o++] = z+1; verts[o++] = 1; verts[o++] = 1;
        verts[o++] = x;   verts[o++] = y01; verts[o++] = z+1; verts[o++] = 0; verts[o++] = 1;
      }
    }
    g_groundBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, g_groundBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    g_groundVerts = MAP_SIZE * MAP_SIZE * 6;
  }

  g_worldDirty = false;
}

// claude wrote this
function drawWorld(gl, a_Position, a_UV, u_whichTexture, u_texColorWeight, u_baseColor, u_ModelMatrix, identityMatrix) {
  if (g_worldDirty) rebuildWorldGeometry(gl);

  gl.uniformMatrix4fv(u_ModelMatrix, false, identityMatrix.elements);
  gl.uniform1f(u_texColorWeight, 1.0);
  gl.uniform4f(u_baseColor, 1, 1, 1, 1);

  // Ground
  gl.uniform1i(u_whichTexture, TEX_GROUND);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_groundBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 20, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 20, 12);
  gl.enableVertexAttribArray(a_UV);
  gl.drawArrays(gl.TRIANGLES, 0, g_groundVerts);

  // Walls — one bind+draw per texture
  for (const k of TEX_GROUPS) {
    const b = g_wallBuffers[k];
    if (!b || b.vertCount === 0) continue;
    gl.uniform1i(u_whichTexture, k);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.buffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 20, 12);
    gl.drawArrays(gl.TRIANGLES, 0, b.vertCount);
  }
}
