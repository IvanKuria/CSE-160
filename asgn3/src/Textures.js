// Textures.js — load N textures into texture units 0..N-1 and keep them bound.
// Texture index convention (matches u_whichTexture in the fragment shader):
//   0 = sand wall, 1 = stone wall, 2 = palm, 3 = water (jug), 4 = ground sand, 5 = sky.

const TEX_FILES = [
  { unit: 0, path: '../assets/sand.jpg' },
  { unit: 1, path: '../assets/stone.jpg' },
  { unit: 2, path: '../assets/palm.jpg' },
  { unit: 3, path: '../assets/water.jpg' },
  { unit: 4, path: '../assets/ground_sand.jpg' },
  { unit: 5, path: '../assets/sky.jpg' },
];

// claude wrote this
function initTextures(gl, samplerLocs, onAllLoaded) {
  let remaining = TEX_FILES.length;
  TEX_FILES.forEach(({ unit, path }) => {
    const img = new Image();
    img.onload = () => {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      // Bind sampler uniform once — texture stays in its unit for the session.
      gl.uniform1i(samplerLocs[unit], unit);
      if (--remaining === 0) onAllLoaded();
    };
    img.onerror = () => {
      console.warn('Failed to load', path, '— continuing without it');
      if (--remaining === 0) onAllLoaded();
    };
    img.src = path;
  });
}
