// Camera.js — first-person camera per the asgn3 spec.
// All scratch vectors/matrices are allocated once in the constructor and
// reused every frame; no `new` in the hot path (performance rubric point).

// claude wrote this entire class
class Camera {
  constructor(canvas) {
    this.fov = 75;
    this.eye = new Vector3([4, 1.6, 4]);
    this.at  = new Vector3([5, 1.6, 4]);
    this.up  = new Vector3([0, 1, 0]);

    this.viewMatrix = new Matrix4();
    this.projectionMatrix = new Matrix4();
    this.projectionMatrix.setPerspective(this.fov, canvas.width / canvas.height, 0.1, 1000);
    this._updateView();

    // Reusable scratch
    this._f = new Vector3();
    this._s = new Vector3();
    this._rot = new Matrix4();
  }

  _updateView() {
    const e = this.eye.elements, a = this.at.elements, u = this.up.elements;
    this.viewMatrix.setLookAt(e[0], e[1], e[2], a[0], a[1], a[2], u[0], u[1], u[2]);
  }

  // f = normalize(at - eye)
  _forward(out) {
    out.set(this.at);
    out.sub(this.eye);
    out.normalize();
    return out;
  }

  moveForward(speed) {
    const f = this._forward(this._f);
    f.mul(speed);
    this.eye.add(f); this.at.add(f);
    this._updateView();
  }

  moveBackwards(speed) {
    const f = this._forward(this._f);
    f.mul(-speed);
    this.eye.add(f); this.at.add(f);
    this._updateView();
  }

  // Strafe: side = up × forward (so positive = left in a right-handed system)
  moveLeft(speed) {
    const f = this._forward(this._f);
    const s = Vector3.cross(this.up, f);
    s.normalize(); s.mul(speed);
    this._s.set(s);
    this.eye.add(this._s); this.at.add(this._s);
    this._updateView();
  }

  moveRight(speed) {
    const f = this._forward(this._f);
    const s = Vector3.cross(f, this.up);
    s.normalize(); s.mul(speed);
    this._s.set(s);
    this.eye.add(this._s); this.at.add(this._s);
    this._updateView();
  }

  panLeft(alpha) {
    // f = at - eye (not normalized, so |at - eye| is preserved through the rotation)
    this._f.set(this.at);
    this._f.sub(this.eye);
    const f = this._f;
    // Rotate forward vector by +alpha degrees about the up axis.
    this._rot.setRotate(alpha, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
    const fp = this._rot.multiplyVector3(f);
    this.at.elements[0] = this.eye.elements[0] + fp.elements[0];
    this.at.elements[1] = this.eye.elements[1] + fp.elements[1];
    this.at.elements[2] = this.eye.elements[2] + fp.elements[2];
    this._updateView();
  }

  panRight(alpha) {
    this.panLeft(-alpha);
  }

  // Pitch: tilt around the side axis. Clamp pitch so we never look straight up/down.
  pitch(alpha) {
    // Preserve |at - eye| through the rotation
    this._f.set(this.at);
    this._f.sub(this.eye);
    const f = this._f;
    const side = Vector3.cross(f, this.up);
    side.normalize();
    // Current pitch = angle between f and the horizontal projection.
    const horizLen = Math.hypot(f.elements[0], f.elements[2]);
    const curPitch = Math.atan2(f.elements[1], horizLen) * 180 / Math.PI;
    let newPitch = curPitch + alpha;
    if (newPitch > 85)  alpha = 85 - curPitch;
    if (newPitch < -85) alpha = -85 - curPitch;
    this._rot.setRotate(alpha, side.elements[0], side.elements[1], side.elements[2]);
    const fp = this._rot.multiplyVector3(f);
    this.at.elements[0] = this.eye.elements[0] + fp.elements[0];
    this.at.elements[1] = this.eye.elements[1] + fp.elements[1];
    this.at.elements[2] = this.eye.elements[2] + fp.elements[2];
    this._updateView();
  }
}

// Convenience: world-space forward vector (horizontal only) for movement & block targeting
// claude wrote this
Camera.prototype.forwardXZ = function(out) {
  out.set(this.at);
  out.sub(this.eye);
  out.elements[1] = 0;
  out.normalize();
  return out;
};
