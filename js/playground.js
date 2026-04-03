(function () {
  // -- Activation functions --------------------------------------------------

  var activations = {
    relu: function (x) { return x > 0 ? x : 0; },
    tanh: function (x) { return Math.tanh(x); },
    sigmoid: function (x) { return 1 / (1 + Math.exp(-x)); }
  };

  var activationDerivatives = {
    relu: function (x) { return x > 0 ? 1 : 0; },
    tanh: function (x) { var t = Math.tanh(x); return 1 - t * t; },
    sigmoid: function (x) { var s = 1 / (1 + Math.exp(-x)); return s * (1 - s); }
  };

  // -- Neural Network --------------------------------------------------------

  function NeuralNetwork(layerSizes, activationName) {
    this.layerSizes = layerSizes;
    this.activationName = activationName || 'relu';
    this.weights = [];
    this.biases = [];
    this.initWeights();
  }

  NeuralNetwork.prototype.initWeights = function () {
    this.weights = [];
    this.biases = [];
    for (var i = 0; i < this.layerSizes.length - 1; i++) {
      var rows = this.layerSizes[i + 1];
      var cols = this.layerSizes[i];
      var scale = Math.sqrt(2 / cols);
      var w = [];
      var b = [];
      for (var r = 0; r < rows; r++) {
        var row = [];
        for (var c = 0; c < cols; c++) {
          row.push((Math.random() * 2 - 1) * scale);
        }
        w.push(row);
        b.push(0);
      }
      this.weights.push(w);
      this.biases.push(b);
    }
  };

  NeuralNetwork.prototype.forward = function (input) {
    var act = activations[this.activationName];
    var preActivations = [];
    var postActivations = [input.slice()];
    var current = input;

    for (var l = 0; l < this.weights.length; l++) {
      var w = this.weights[l];
      var b = this.biases[l];
      var pre = [];
      var post = [];
      for (var j = 0; j < w.length; j++) {
        var sum = b[j];
        for (var k = 0; k < current.length; k++) {
          sum += w[j][k] * current[k];
        }
        pre.push(sum);
        if (l === this.weights.length - 1) {
          post.push(activations.sigmoid(sum));
        } else {
          post.push(act(sum));
        }
      }
      preActivations.push(pre);
      postActivations.push(post);
      current = post;
    }

    return { preActivations: preActivations, postActivations: postActivations };
  };

  NeuralNetwork.prototype.predict = function (input) {
    var result = this.forward(input);
    return result.postActivations[result.postActivations.length - 1][0];
  };

  NeuralNetwork.prototype.train = function (inputs, labels, lr) {
    var totalLoss = 0;

    for (var s = 0; s < inputs.length; s++) {
      var result = this.forward(inputs[s]);
      var pre = result.preActivations;
      var post = result.postActivations;
      var output = post[post.length - 1][0];
      var target = labels[s];

      var eps = 1e-7;
      totalLoss += -(target * Math.log(output + eps) + (1 - target) * Math.log(1 - output + eps));

      var numLayers = this.weights.length;
      var deltas = new Array(numLayers);

      var outputError = output - target;
      deltas[numLayers - 1] = [outputError];

      for (var l = numLayers - 2; l >= 0; l--) {
        var dAct = activationDerivatives[this.activationName];
        var d = [];
        for (var j = 0; j < this.weights[l].length; j++) {
          var err = 0;
          for (var k = 0; k < this.weights[l + 1].length; k++) {
            err += this.weights[l + 1][k][j] * deltas[l + 1][k];
          }
          d.push(err * dAct(pre[l][j]));
        }
        deltas[l] = d;
      }

      for (var l = 0; l < numLayers; l++) {
        for (var j = 0; j < this.weights[l].length; j++) {
          for (var k = 0; k < this.weights[l][j].length; k++) {
            this.weights[l][j][k] -= lr * deltas[l][j] * post[l][k];
          }
          this.biases[l][j] -= lr * deltas[l][j];
        }
      }
    }

    return totalLoss / inputs.length;
  };

  // -- Datasets --------------------------------------------------------------

  function generateCircle(n) {
    var points = [];
    var labels = [];
    for (var i = 0; i < n; i++) {
      var angle = Math.random() * Math.PI * 2;
      var r = Math.random() * 0.5;
      var label = r < 0.25 ? 1 : 0;
      points.push([Math.cos(angle) * r, Math.sin(angle) * r]);
      labels.push(label);
    }
    return { points: points, labels: labels };
  }

  function generateXOR(n) {
    var points = [];
    var labels = [];
    for (var i = 0; i < n; i++) {
      var x = Math.random() * 2 - 1;
      var y = Math.random() * 2 - 1;
      x += (Math.random() - 0.5) * 0.1;
      y += (Math.random() - 0.5) * 0.1;
      var label = (x > 0) === (y > 0) ? 0 : 1;
      points.push([x, y]);
      labels.push(label);
    }
    return { points: points, labels: labels };
  }

  function generateSpiral(n) {
    var points = [];
    var labels = [];
    var half = Math.floor(n / 2);
    for (var cls = 0; cls < 2; cls++) {
      for (var i = 0; i < half; i++) {
        var t = (i / half) * 2 * Math.PI + cls * Math.PI;
        var r = (i / half) * 0.5;
        var noise = (Math.random() - 0.5) * 0.1;
        points.push([r * Math.cos(t) + noise, r * Math.sin(t) + noise]);
        labels.push(cls);
      }
    }
    return { points: points, labels: labels };
  }

  function generateGaussian(n) {
    var points = [];
    var labels = [];
    var half = Math.floor(n / 2);
    for (var i = 0; i < half; i++) {
      points.push([gaussRand() * 0.2 + 0.3, gaussRand() * 0.2 + 0.3]);
      labels.push(0);
    }
    for (var i = 0; i < half; i++) {
      points.push([gaussRand() * 0.2 - 0.3, gaussRand() * 0.2 - 0.3]);
      labels.push(1);
    }
    return { points: points, labels: labels };
  }

  function gaussRand() {
    var u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  var datasets = {
    circle: generateCircle,
    xor: generateXOR,
    spiral: generateSpiral,
    gaussian: generateGaussian
  };

  // -- State -----------------------------------------------------------------

  var state = {
    dataset: 'circle',
    hiddenLayers: [4],
    activation: 'relu',
    learningRate: 0.03,
    running: false,
    epoch: 0,
    loss: 0,
    net: null,
    data: null,
    animId: null
  };

  // -- DOM refs --------------------------------------------------------------

  var boundaryCanvas, boundaryCtx;
  var diagramCanvas, diagramCtx;

  function init() {
    boundaryCanvas = document.getElementById('boundary-canvas');
    diagramCanvas = document.getElementById('diagram-canvas');
    if (!boundaryCanvas || !diagramCanvas) return;
    boundaryCtx = boundaryCanvas.getContext('2d');
    diagramCtx = diagramCanvas.getContext('2d');

    setupControls();
    resetNetwork();
    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);
  }

  function resizeCanvases() {
    var boundaryContainer = boundaryCanvas.parentElement;
    var diagramContainer = diagramCanvas.parentElement;

    var bw = boundaryContainer.clientWidth;
    var bh = boundaryContainer.clientHeight || bw;
    boundaryCanvas.width = bw * (window.devicePixelRatio || 1);
    boundaryCanvas.height = bh * (window.devicePixelRatio || 1);
    boundaryCanvas.style.width = bw + 'px';
    boundaryCanvas.style.height = bh + 'px';
    boundaryCtx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);

    var dw = diagramContainer.clientWidth;
    var dh = diagramContainer.clientHeight || dw;
    diagramCanvas.width = dw * (window.devicePixelRatio || 1);
    diagramCanvas.height = dh * (window.devicePixelRatio || 1);
    diagramCanvas.style.width = dw + 'px';
    diagramCanvas.style.height = dh + 'px';
    diagramCtx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);

    renderBoundary();
    renderDiagram();
  }

  // -- Controls --------------------------------------------------------------

  function setupControls() {
    var datasetBtns = document.querySelectorAll('[data-dataset]');
    for (var i = 0; i < datasetBtns.length; i++) {
      datasetBtns[i].addEventListener('click', function () {
        state.dataset = this.getAttribute('data-dataset');
        updateDatasetButtons();
        resetNetwork();
      });
    }

    document.getElementById('activation-select').addEventListener('change', function () {
      state.activation = this.value;
      resetNetwork();
    });

    var lrSlider = document.getElementById('lr-slider');
    var lrValue = document.getElementById('lr-value');
    lrSlider.addEventListener('input', function () {
      var t = parseFloat(this.value);
      state.learningRate = Math.pow(10, t);
      lrValue.textContent = state.learningRate.toFixed(4);
    });

    document.getElementById('btn-play').addEventListener('click', togglePlay);
    document.getElementById('btn-step').addEventListener('click', stepOnce);
    document.getElementById('btn-reset').addEventListener('click', function () {
      state.running = false;
      updatePlayButton();
      resetNetwork();
    });

    document.getElementById('add-layer').addEventListener('click', function () {
      if (state.hiddenLayers.length < 4) {
        state.hiddenLayers.push(4);
        rebuildLayerControls();
        resetNetwork();
      }
    });

    document.getElementById('remove-layer').addEventListener('click', function () {
      if (state.hiddenLayers.length > 1) {
        state.hiddenLayers.pop();
        rebuildLayerControls();
        resetNetwork();
      }
    });

    rebuildLayerControls();
    updateDatasetButtons();
  }

  function updateDatasetButtons() {
    var btns = document.querySelectorAll('[data-dataset]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-dataset') === state.dataset);
    }
  }

  function rebuildLayerControls() {
    var container = document.getElementById('layer-neurons');
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    for (var i = 0; i < state.hiddenLayers.length; i++) {
      var layerDiv = document.createElement('div');
      layerDiv.className = 'layer-neuron-control';

      var label = document.createElement('span');
      label.className = 'layer-label';
      label.textContent = 'L' + (i + 1);

      var minus = document.createElement('button');
      minus.className = 'neuron-btn';
      minus.textContent = '-';
      minus.setAttribute('data-layer', i);
      minus.addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-layer'));
        if (state.hiddenLayers[idx] > 1) {
          state.hiddenLayers[idx]--;
          rebuildLayerControls();
          resetNetwork();
        }
      });

      var count = document.createElement('span');
      count.className = 'neuron-count';
      count.textContent = state.hiddenLayers[i];

      var plus = document.createElement('button');
      plus.className = 'neuron-btn';
      plus.textContent = '+';
      plus.setAttribute('data-layer', i);
      plus.addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-layer'));
        if (state.hiddenLayers[idx] < 8) {
          state.hiddenLayers[idx]++;
          rebuildLayerControls();
          resetNetwork();
        }
      });

      layerDiv.appendChild(label);
      layerDiv.appendChild(minus);
      layerDiv.appendChild(count);
      layerDiv.appendChild(plus);
      container.appendChild(layerDiv);
    }
  }

  function togglePlay() {
    state.running = !state.running;
    updatePlayButton();
    if (state.running) requestAnimationFrame(trainLoop);
  }

  function updatePlayButton() {
    var btn = document.getElementById('btn-play');
    btn.textContent = state.running ? 'Pause' : 'Play';
  }

  function stepOnce() {
    if (state.running) return;
    trainStep();
    renderBoundary();
    renderDiagram();
    updateStats();
  }

  // -- Network lifecycle -----------------------------------------------------

  function resetNetwork() {
    if (state.animId) cancelAnimationFrame(state.animId);
    state.epoch = 0;
    state.loss = 0;
    var sizes = [2].concat(state.hiddenLayers).concat([1]);
    state.net = new NeuralNetwork(sizes, state.activation);
    state.data = datasets[state.dataset](200);
    renderBoundary();
    renderDiagram();
    updateStats();
  }

  function trainStep() {
    var batchSize = 32;
    var indices = [];
    for (var i = 0; i < batchSize; i++) {
      indices.push(Math.floor(Math.random() * state.data.points.length));
    }
    var batchInputs = [];
    var batchLabels = [];
    for (var i = 0; i < indices.length; i++) {
      batchInputs.push(state.data.points[indices[i]]);
      batchLabels.push(state.data.labels[indices[i]]);
    }
    state.loss = state.net.train(batchInputs, batchLabels, state.learningRate);
    state.epoch++;
  }

  var frameCount = 0;
  function trainLoop() {
    if (!state.running) return;
    for (var i = 0; i < 3; i++) trainStep();
    frameCount++;
    if (frameCount % 2 === 0) {
      renderBoundary();
      renderDiagram();
    }
    updateStats();
    state.animId = requestAnimationFrame(trainLoop);
  }

  function updateStats() {
    document.getElementById('stat-epoch').textContent = state.epoch;
    document.getElementById('stat-loss').textContent = state.loss.toFixed(4);
  }

  // -- Decision boundary rendering -------------------------------------------

  function renderBoundary() {
    if (!boundaryCtx) return;
    var w = boundaryCanvas.style.width ? parseInt(boundaryCanvas.style.width) : boundaryCanvas.width;
    var h = boundaryCanvas.style.height ? parseInt(boundaryCanvas.style.height) : boundaryCanvas.height;

    var res = 50;
    var cellW = w / res;
    var cellH = h / res;

    boundaryCtx.clearRect(0, 0, w, h);

    var blue = [79, 143, 255];
    var teal = [34, 211, 167];
    var bgDark = [10, 10, 15];

    for (var i = 0; i < res; i++) {
      for (var j = 0; j < res; j++) {
        var x = (i / res) * 2 - 1;
        var y = (j / res) * 2 - 1;
        var pred = state.net.predict([x, y]);
        var t = Math.max(0, Math.min(1, pred));

        var r = Math.round(blue[0] * (1 - t) + teal[0] * t);
        var g = Math.round(blue[1] * (1 - t) + teal[1] * t);
        var b = Math.round(blue[2] * (1 - t) + teal[2] * t);

        r = Math.round(r * 0.35 + bgDark[0] * 0.65);
        g = Math.round(g * 0.35 + bgDark[1] * 0.65);
        b = Math.round(b * 0.35 + bgDark[2] * 0.65);

        boundaryCtx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        boundaryCtx.fillRect(i * cellW, j * cellH, cellW + 1, cellH + 1);
      }
    }

    var pts = state.data.points;
    var lbls = state.data.labels;
    for (var i = 0; i < pts.length; i++) {
      var px = ((pts[i][0] + 1) / 2) * w;
      var py = ((pts[i][1] + 1) / 2) * h;
      boundaryCtx.beginPath();
      boundaryCtx.arc(px, py, 3, 0, Math.PI * 2);
      if (lbls[i] === 0) {
        boundaryCtx.fillStyle = 'rgba(79, 143, 255, 0.9)';
        boundaryCtx.strokeStyle = 'rgba(79, 143, 255, 0.4)';
      } else {
        boundaryCtx.fillStyle = 'rgba(34, 211, 167, 0.9)';
        boundaryCtx.strokeStyle = 'rgba(34, 211, 167, 0.4)';
      }
      boundaryCtx.lineWidth = 1.5;
      boundaryCtx.fill();
      boundaryCtx.stroke();
    }
  }

  // -- Network diagram rendering ---------------------------------------------

  function renderDiagram() {
    if (!diagramCtx) return;
    var w = parseInt(diagramCanvas.style.width) || diagramCanvas.width;
    var h = parseInt(diagramCanvas.style.height) || diagramCanvas.height;
    diagramCtx.clearRect(0, 0, w, h);

    var sizes = state.net.layerSizes;
    var numLayers = sizes.length;
    var layerGap = w / (numLayers + 1);
    var maxNeurons = 0;
    for (var i = 0; i < sizes.length; i++) {
      if (sizes[i] > maxNeurons) maxNeurons = sizes[i];
    }
    var neuronRadius = Math.min(14, h / (maxNeurons * 3 + 2));

    var positions = [];
    for (var l = 0; l < numLayers; l++) {
      var layerPositions = [];
      var n = sizes[l];
      var totalHeight = (n - 1) * neuronRadius * 3;
      var startY = (h - totalHeight) / 2;
      var x = layerGap * (l + 1);
      for (var j = 0; j < n; j++) {
        layerPositions.push({ x: x, y: startY + j * neuronRadius * 3 });
      }
      positions.push(layerPositions);
    }

    for (var l = 0; l < state.net.weights.length; l++) {
      var wt = state.net.weights[l];
      for (var j = 0; j < wt.length; j++) {
        for (var k = 0; k < wt[j].length; k++) {
          var val = wt[j][k];
          var from = positions[l][k];
          var to = positions[l + 1][j];
          var absVal = Math.min(Math.abs(val), 3);
          var alpha = 0.15 + (absVal / 3) * 0.7;
          var thickness = 0.5 + (absVal / 3) * 2.5;

          if (val > 0) {
            diagramCtx.strokeStyle = 'rgba(79, 143, 255,' + alpha + ')';
          } else {
            diagramCtx.strokeStyle = 'rgba(255, 120, 70,' + alpha + ')';
          }
          diagramCtx.lineWidth = thickness;
          diagramCtx.beginPath();
          diagramCtx.moveTo(from.x, from.y);
          diagramCtx.lineTo(to.x, to.y);
          diagramCtx.stroke();
        }
      }
    }

    for (var l = 0; l < numLayers; l++) {
      for (var j = 0; j < positions[l].length; j++) {
        var pos = positions[l][j];
        diagramCtx.beginPath();
        diagramCtx.arc(pos.x, pos.y, neuronRadius, 0, Math.PI * 2);
        diagramCtx.fillStyle = '#1a1a28';
        diagramCtx.fill();
        if (l === 0) {
          diagramCtx.strokeStyle = 'rgba(79, 143, 255, 0.6)';
        } else if (l === numLayers - 1) {
          diagramCtx.strokeStyle = 'rgba(34, 211, 167, 0.6)';
        } else {
          diagramCtx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        }
        diagramCtx.lineWidth = 1.5;
        diagramCtx.stroke();
      }
    }

    diagramCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    diagramCtx.font = '11px Inter, sans-serif';
    diagramCtx.textAlign = 'center';
    var layerLabels = ['Input'];
    for (var i = 0; i < state.hiddenLayers.length; i++) {
      layerLabels.push('Hidden ' + (i + 1));
    }
    layerLabels.push('Output');
    for (var l = 0; l < numLayers; l++) {
      var x = layerGap * (l + 1);
      diagramCtx.fillText(layerLabels[l], x, h - 8);
    }
  }

  // -- Bootstrap -------------------------------------------------------------

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
