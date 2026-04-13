// Written by Claude
class Triangle {
  constructor() {
    this.type = 'triangle';
    this.position = [0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 5.0;
  }

  render() {
    var xy = this.position;
    var rgba = this.color;
    var d = this.size / 200.0;  // Scale size to WebGL coordinates

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    // Draw a triangle centered at the click position
    drawTriangle([
      xy[0],     xy[1] + d,      // top
      xy[0] - d, xy[1] - d,      // bottom-left
      xy[0] + d, xy[1] - d       // bottom-right
    ]);
  }
}

function drawTriangle(vertices) {
  var n = 3;

  // Create a buffer object
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // Write data into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  // Assign the buffer object to a_Position variable
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_Position);

  // Draw the triangle
  gl.drawArrays(gl.TRIANGLES, 0, n);
}
