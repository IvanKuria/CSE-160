// Written by Claude
class Circle {
  constructor() {
    this.type = 'circle';
    this.position = [0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 5.0;
    this.segments = 10;
  }

  render() {
    var xy = this.position;
    var rgba = this.color;
    var d = this.size / 200.0;  // Scale size to WebGL coordinates

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    var angleStep = 360 / this.segments;
    for (var angle = 0; angle < 360; angle += angleStep) {
      var angle1 = angle * Math.PI / 180;
      var angle2 = (angle + angleStep) * Math.PI / 180;

      drawTriangle([
        xy[0], xy[1],                                     // center
        xy[0] + d * Math.cos(angle1), xy[1] + d * Math.sin(angle1),  // edge point 1
        xy[0] + d * Math.cos(angle2), xy[1] + d * Math.sin(angle2)   // edge point 2
      ]);
    }
  }
}
