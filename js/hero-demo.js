(function () {
  var canvas = document.getElementById('hero-demo-canvas');
  if (!canvas) return;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 300, H = 225;
  canvas.width = W;
  canvas.height = H;
  var ctx = canvas.getContext('2d');

  // --- Network (same architecture as playground.js) ---

  function relu(x) { return x > 0 ? x : 0; }
  function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

  var layers, weights, biases;

  function init() {
    layers = [2, 8, 8, 1];
    weights = [];
    biases = [];
    for (var l = 0; l < layers.length - 1; l++) {
      var rows = layers[l + 1], cols = layers[l];
      var scale = Math.sqrt(2 / cols);
      var w = [], b = [];
      for (var r = 0; r < rows; r++) {
        var row = [];
        for (var c = 0; c < cols; c++) row.push((Math.random() * 2 - 1) * scale);
        w.push(row);
        b.push(0);
      }
      weights.push(w);
      biases.push(b);
    }
  }

  function predict(inp) {
    var cur = inp;
    for (var l = 0; l < weights.length; l++) {
      var next = [];
      for (var j = 0; j < weights[l].length; j++) {
        var sum = biases[l][j];
        for (var k = 0; k < cur.length; k++) sum += weights[l][j][k] * cur[k];
        next.push(l === weights.length - 1 ? sigmoid(sum) : relu(sum));
      }
      cur = next;
    }
    return cur[0];
  }

  function trainBatch(points, labels, lr) {
    for (var s = 0; s < points.length; s++) {
      var inp = points[s];
      // Forward
      var pre = [], post = [inp.slice()];
      var cur = inp;
      for (var l = 0; l < weights.length; l++) {
        var preL = [], postL = [];
        for (var j = 0; j < weights[l].length; j++) {
          var sum = biases[l][j];
          for (var k = 0; k < cur.length; k++) sum += weights[l][j][k] * cur[k];
          preL.push(sum);
          postL.push(l === weights.length - 1 ? sigmoid(sum) : relu(sum));
        }
        pre.push(preL);
        post.push(postL);
        cur = postL;
      }
      // Backward
      var nL = weights.length;
      var deltas = new Array(nL);
      deltas[nL - 1] = [post[nL][0] - labels[s]];
      for (var l = nL - 2; l >= 0; l--) {
        var d = [];
        for (var j = 0; j < weights[l].length; j++) {
          var err = 0;
          for (var k2 = 0; k2 < weights[l + 1].length; k2++) {
            err += weights[l + 1][k2][j] * deltas[l + 1][k2];
          }
          d.push(err * (pre[l][j] > 0 ? 1 : 0));
        }
        deltas[l] = d;
      }
      for (var l = 0; l < nL; l++) {
        for (var j = 0; j < weights[l].length; j++) {
          for (var k = 0; k < weights[l][j].length; k++) {
            weights[l][j][k] -= lr * deltas[l][j] * post[l][k];
          }
          biases[l][j] -= lr * deltas[l][j];
        }
      }
    }
  }

  // --- Dataset ---
  function makeData() {
    var pts = [], lbl = [];
    for (var i = 0; i < 120; i++) {
      var a = Math.random() * Math.PI * 2;
      var r = Math.random() * 0.5;
      var label = r < 0.25 ? 1 : 0;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      lbl.push(label);
    }
    return { points: pts, labels: lbl };
  }

  // --- Rendering ---
  // Cream to warm near-black — ink on parchment
  var C0r = 248, C0g = 244, C0b = 237;  // warm cream (class 0 / low)
  var C1r = 95,  C1g = 82,  C1b = 72;   // warm mid-brown — lighter ink wash

  var imgData = ctx.createImageData(W, H);

  function render(pts, lbl) {
    for (var py = 0; py < H; py++) {
      for (var px = 0; px < W; px++) {
        var x = (px / W) * 2 - 1;
        var y = (py / H) * 2 - 1;
        var v = predict([x, y]);
        v = v * v * (3 - 2 * v); // smoothstep
        var i = (py * W + px) * 4;
        imgData.data[i]     = Math.round(C0r + (C1r - C0r) * v);
        imgData.data[i + 1] = Math.round(C0g + (C1g - C0g) * v);
        imgData.data[i + 2] = Math.round(C0b + (C1b - C0b) * v);
        imgData.data[i + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Data points
    for (var i = 0; i < pts.length; i++) {
      var px = (pts[i][0] + 1) / 2 * W;
      var py = (pts[i][1] + 1) / 2 * H;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fillStyle = lbl[i] === 1 ? '#5f5248' : '#c0b8a8';
      ctx.fill();
    }
  }

  // --- Animation loop ---
  var data, epoch, maxEpoch = 500, lr = 0.005;

  function reset() {
    data = makeData();
    epoch = 0;
    init();
  }

  function step() {
    trainBatch(data.points, data.labels, lr);
    epoch++;
    render(data.points, data.labels);

    if (epoch >= maxEpoch) {
      setTimeout(function () { reset(); requestAnimationFrame(step); }, 4000);
      return;
    }
    requestAnimationFrame(step);
  }

  reset();

  if (reducedMotion) {
    for (var e = 0; e < 80; e++) trainBatch(data.points, data.labels, lr);
    render(data.points, data.labels);
  } else {
    requestAnimationFrame(step);
  }
})();
