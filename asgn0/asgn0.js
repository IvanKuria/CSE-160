// DrawTriangle.js (c) 2012 matsuda
function main() {  
  // Retrieve <canvas> element
  canvas = document.getElementById('example');  
  if (!canvas) { 
    console.log('Failed to retrieve the <canvas> element');
    return false; 
  } 

  // Get the rendering context for 2DCG
  ctx = canvas.getContext('2d'); // decided to make it a global var
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  var v1 = new Vector3([2.25, 2.25, 0]);
  drawVector(v1, "red");
}

function drawVector(v, color) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.moveTo(200, 200);
  ctx.lineTo(200 + (v.elements[0] * 20), 200 - (v.elements[1] * 20));
  ctx.stroke();
}

function handleDrawEvent() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // clears canvas
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  
    const x = document.getElementById("x").value; // x val
    const y = document.getElementById("y").value; // y val

    const x2 = document.getElementById("x-2").value; // x-2 val
    const y2 = document.getElementById("y-2").value; // y-2 val 
    
    var v1 = new Vector3([x, y, 0]);
    var v2 = new Vector3([x2, y2, 0]);
    drawVector(v1, "red")
    drawVector(v2, "blue")
}

function handleDrawOperationEvent() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // clears canvas
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const x = document.getElementById("x").value; // x val
    const y = document.getElementById("y").value; // y val
    const x2 = document.getElementById("x-2").value; // x-2 val
    const y2 = document.getElementById("y-2").value; // y-2 val

    var v1 = new Vector3([x, y, 0]);
    var v2 = new Vector3([x2, y2, 0]);
    drawVector(v1, "red");
    drawVector(v2, "blue");

    var op = document.getElementById("op-select").value;
    var scalar = document.getElementById("scalar").value;

    if (op == "add") {
        var v3 = new Vector3([x, y, 0]);
        v3.add(v2);
        drawVector(v3, "green");
    } else if (op == "sub") {
        var v3 = new Vector3([x, y, 0]);
        v3.sub(v2);
        drawVector(v3, "green");
    } else if (op == "mul") {
        var v3 = new Vector3([x, y, 0]);
        var v4 = new Vector3([x2, y2, 0]);
        v3.mul(scalar);
        v4.mul(scalar);
        drawVector(v3, "green");
        drawVector(v4, "green");
    } else if (op == "div") {
        var v3 = new Vector3([x, y, 0]);
        var v4 = new Vector3([x2, y2, 0]);
        v3.div(scalar);
        v4.div(scalar);
        drawVector(v3, "green");
        drawVector(v4, "green");
    } else if (op == "magnitude") {
        console.log("Magnitude v1: " + v1.magnitude());
        console.log("Magnitude v2: " + v2.magnitude());
    } else if (op == "normalize") {
        var v3 = new Vector3([x, y, 0]);
        var v4 = new Vector3([x2, y2, 0]);
        v3.normalize();
        v4.normalize();
        drawVector(v3, "green");
        drawVector(v4, "green");
    }
}

// main();

// sources: 
// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineTo
// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/beginPath