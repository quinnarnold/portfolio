(function () {
  var kernels = {
    identity:  { values: [0,0,0, 0,1,0, 0,0,0], divisor: 1 },
    sobelX:    { values: [-1,0,1, -2,0,2, -1,0,1], divisor: 1 },
    sobelY:    { values: [-1,-2,-1, 0,0,0, 1,2,1], divisor: 1 },
    laplacian: { values: [0,-1,0, -1,4,-1, 0,-1,0], divisor: 1 },
    gaussian:  { values: [1,2,1, 2,4,2, 1,2,1], divisor: 16 },
    sharpen:   { values: [0,-1,0, -1,5,-1, 0,-1,0], divisor: 1 },
    emboss:    { values: [-2,-1,0, -1,1,1, 0,1,2], divisor: 1 },
    boxBlur:   { values: [1,1,1, 1,1,1, 1,1,1], divisor: 9 },
    custom:    { values: [0,0,0, 0,1,0, 0,0,0], divisor: 1 }
  };

  var sourceCanvas = document.getElementById('source-canvas');
  var outputCanvas = document.getElementById('output-canvas');
  var sourceCtx = sourceCanvas.getContext('2d');
  var outputCtx = outputCanvas.getContext('2d');
  var kernelGrid = document.getElementById('kernel-grid');
  var kernelSelect = document.getElementById('kernel-select');
  var fileInput = document.getElementById('file-input');
  var sourceBtns = document.querySelectorAll('.pg-dataset-btn[data-source]');
  var btnApply = document.getElementById('btn-apply');
  var btnReset = document.getElementById('btn-reset');

  var state = {
    currentSource: 'shapes',
    currentKernel: 'identity',
    canvasSize: 400,
    dpr: Math.min(window.devicePixelRatio || 1, 2)
  };

  function setupCanvases() {
    var container = sourceCanvas.parentElement;
    var size = container.clientWidth;
    state.canvasSize = size;

    [sourceCanvas, outputCanvas].forEach(function (c) {
      c.width = size * state.dpr;
      c.height = size * state.dpr;
      c.style.width = size + 'px';
      c.style.height = size + 'px';
    });
  }

  function drawShapes() {
    var w = sourceCanvas.width;
    var h = sourceCanvas.height;
    var ctx = sourceCtx;
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#4f8fff';
    ctx.beginPath();
    ctx.arc(w * 0.3, h * 0.35, w * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#22d3a7';
    ctx.lineWidth = w * 0.015;
    ctx.strokeRect(w * 0.55, h * 0.15, w * 0.3, h * 0.3);

    ctx.fillStyle = '#ffa032';
    ctx.beginPath();
    ctx.moveTo(w * 0.25, h * 0.85);
    ctx.lineTo(w * 0.45, h * 0.55);
    ctx.lineTo(w * 0.65, h * 0.85);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#e8e8ed';
    ctx.lineWidth = w * 0.008;
    for (var i = 0; i < 5; i++) {
      var y = h * 0.6 + i * h * 0.06;
      ctx.beginPath();
      ctx.moveTo(w * 0.6, y);
      ctx.lineTo(w * 0.9, y);
      ctx.stroke();
    }
  }

  function drawGradient() {
    var w = sourceCanvas.width;
    var h = sourceCanvas.height;
    var ctx = sourceCtx;

    var grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#4f8fff');
    grad.addColorStop(1, '#22d3a7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#0a0a0f';
    var barWidth = w * 0.02;
    var gap = w * 0.1;
    for (var x = gap; x < w; x += gap) {
      ctx.fillRect(x - barWidth / 2, 0, barWidth, h);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (var y = gap; y < h; y += gap) {
      ctx.fillRect(0, y - barWidth / 2, w, barWidth);
    }
  }

  function drawText() {
    var w = sourceCanvas.width;
    var h = sourceCanvas.height;
    var ctx = sourceCtx;
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#e8e8ed';
    ctx.font = 'bold ' + (w * 0.28) + 'px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CNN', w / 2, h / 2);

    ctx.font = (w * 0.06) + 'px "JetBrains Mono", monospace';
    ctx.fillStyle = '#4f8fff';
    ctx.fillText('convolution', w / 2, h * 0.72);
  }

  function drawSource() {
    switch (state.currentSource) {
      case 'shapes': drawShapes(); break;
      case 'gradient': drawGradient(); break;
      case 'text': drawText(); break;
    }
  }

  function loadUploadedImage(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var w = sourceCanvas.width;
        var h = sourceCanvas.height;
        sourceCtx.fillStyle = '#0a0a0f';
        sourceCtx.fillRect(0, 0, w, h);

        var scale = Math.min(w / img.width, h / img.height);
        var dw = img.width * scale;
        var dh = img.height * scale;
        sourceCtx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        applyConvolution();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function applyConvolution() {
    var w = sourceCanvas.width;
    var h = sourceCanvas.height;
    var src = sourceCtx.getImageData(0, 0, w, h);
    var dst = outputCtx.createImageData(w, h);
    var sd = src.data;
    var dd = dst.data;

    var k = getCurrentKernelValues();
    var div = getCurrentDivisor();

    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var r = 0, g = 0, b = 0;
        for (var ky = -1; ky <= 1; ky++) {
          for (var kx = -1; kx <= 1; kx++) {
            var idx = ((y + ky) * w + (x + kx)) * 4;
            var ki = (ky + 1) * 3 + (kx + 1);
            r += sd[idx]     * k[ki];
            g += sd[idx + 1] * k[ki];
            b += sd[idx + 2] * k[ki];
          }
        }
        var oi = (y * w + x) * 4;
        dd[oi]     = Math.min(255, Math.max(0, r / div));
        dd[oi + 1] = Math.min(255, Math.max(0, g / div));
        dd[oi + 2] = Math.min(255, Math.max(0, b / div));
        dd[oi + 3] = 255;
      }
    }

    outputCtx.putImageData(dst, 0, 0);
  }

  function getCurrentKernelValues() {
    if (state.currentKernel === 'custom') {
      var inputs = kernelGrid.querySelectorAll('.kernel-input');
      var vals = [];
      inputs.forEach(function (inp) {
        vals.push(parseFloat(inp.value) || 0);
      });
      return vals;
    }
    return kernels[state.currentKernel].values.slice();
  }

  function getCurrentDivisor() {
    if (state.currentKernel === 'custom') {
      var vals = getCurrentKernelValues();
      var sum = 0;
      for (var i = 0; i < vals.length; i++) sum += vals[i];
      return sum === 0 ? 1 : Math.abs(sum);
    }
    return kernels[state.currentKernel].divisor;
  }

  function clearElement(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function renderKernelGrid() {
    clearElement(kernelGrid);
    var vals = kernels[state.currentKernel] ? kernels[state.currentKernel].values : kernels.identity.values;
    var isCustom = state.currentKernel === 'custom';

    for (var i = 0; i < 9; i++) {
      if (isCustom) {
        var input = document.createElement('input');
        input.type = 'number';
        input.className = 'kernel-input';
        input.value = vals[i];
        input.step = '0.5';
        kernelGrid.appendChild(input);
      } else {
        var cell = document.createElement('div');
        cell.className = 'kernel-cell';
        if (vals[i] > 0) cell.className += ' positive';
        if (vals[i] < 0) cell.className += ' negative';
        cell.textContent = vals[i];
        kernelGrid.appendChild(cell);
      }
    }
  }

  function setActiveSource(name) {
    sourceBtns.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-source') === name);
    });
  }

  sourceBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var src = this.getAttribute('data-source');
      if (src === 'upload') {
        fileInput.click();
        return;
      }
      state.currentSource = src;
      setActiveSource(src);
      drawSource();
      applyConvolution();
    });
  });

  fileInput.addEventListener('change', function () {
    if (this.files && this.files[0]) {
      state.currentSource = 'upload';
      setActiveSource('upload');
      loadUploadedImage(this.files[0]);
    }
  });

  kernelSelect.addEventListener('change', function () {
    state.currentKernel = this.value;
    renderKernelGrid();
    applyConvolution();
  });

  btnApply.addEventListener('click', function () {
    applyConvolution();
  });

  btnReset.addEventListener('click', function () {
    state.currentKernel = 'identity';
    state.currentSource = 'shapes';
    kernelSelect.value = 'identity';
    setActiveSource('shapes');
    renderKernelGrid();
    drawSource();
    applyConvolution();
  });

  function init() {
    setupCanvases();
    renderKernelGrid();
    drawSource();
    applyConvolution();
  }

  window.addEventListener('resize', function () {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    setupCanvases();
    drawSource();
    applyConvolution();
  });

  init();
})();
