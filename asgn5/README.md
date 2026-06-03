# Assignment 5 — A 3D World with Three.js

**Theme: UC Santa Cruz** — a redwood-forest clearing with campus buildings, a
bell tower, a winding path, an ocean-sky horizon, grazing **deer**, and of
course the UCSC **banana slug** mascot.

Built with [Three.js](https://threejs.org/) (r160), loaded as ES modules from a
CDN via an import map — **no build step**.

## Run it

The page uses `fetch()`-based loaders (GLB + skybox), so it must be served over
HTTP, not opened as a `file://`:

```bash
# from the repository root
python3 -m http.server 8000
# then open:
#   http://localhost:8000/asgn5/src/asgn5.html
```

(Or use the VS Code **Live Server** extension.) It is also deployed on GitHub
Pages — all asset paths are relative so it works from a project subpath.

**Controls:** drag to orbit · scroll to zoom · right-drag to pan.

## ⭐ WOW feature — the animated banana slug

The banana slug is the WOW feature. It is built entirely from primitives (a
chain of 14 tapered spheres + two cylinder eye-stalks) and **crawls along the
path**: each body segment samples a point a little further back along the path
curve every frame, so the body bends through the path's turns, while a
phase-shifted sine wave bobs each segment to fake a peristaltic crawl. The eye
stalks wiggle independently.

## Requirements checklist

| Requirement | In this scene |
|---|---|
| 20+ primary shapes | **119** primitive meshes (logged to the console) |
| ≥3 kinds of shape | Box, Cylinder, Cone, Sphere, Icosahedron, Plane |
| ≥1 textured shape | Grass ground, redwood bark trunks, stucco walls (procedural `CanvasTexture`) |
| ≥1 animated shape | The banana slug (also the WOW feature) |
| Textured 3D model | `deer.glb` loaded with `GLTFLoader` |
| ≥3 light types | HemisphereLight, DirectionalLight (shadows), PointLight (lamp), + AmbientLight |
| Textured skybox | `CubeTextureLoader` cubemap (sky/ocean horizon) |
| Perspective camera | `THREE.PerspectiveCamera` |
| Mouse navigation | `OrbitControls` |

## Credits

- **Deer** model — "Deer" by Poly by Google, via [Poly Pizza](https://poly.pizza/m/0tJzk22c46S) (CC-BY 3.0).
- **Skybox** — `skyboxsun25deg` cubemap from the Three.js examples.
- Grass / bark / wall textures generated procedurally with `<canvas>`.
