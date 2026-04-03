(function () {
  var surfaces = {
    bowl: {
      fn: function (x, y) { return x * x + y * y; },
      grad: function (x, y) { return [2 * x, 2 * y]; },
      range: [-3, 3]
    },
    elongated: {
      fn: function (x, y) { return x * x + 10 * y * y; },
      grad: function (x, y) { return [2 * x, 20 * y]; },
      range: [-3, 3]
    },
    rosenbrock: {
      fn: function (x, y) { return (1 - x) * (1 - x) + 100 * (y - x * x) * (y - x * x); },
      grad: function (x, y) {
        return [
          -2 * (1 - x) + 200 * (y - x * x) * (-2 * x),
          200 * (y - x * x)
        ];
      },
      range: [-2, 2]
    },
    saddle: {
      fn: function (x, y) { return x * x - y * y; },
      grad: function (x, y) { return [2 * x, -2 * y]; },
      range: [-3, 3]
    },
    himmelblau: {
      fn: function (x, y) {
        return (x * x + y - 11) * (x * x + y - 11) + (x + y * y - 7) * (x + y * y - 7);
      },
      grad: function (x, y) {
        return [
          4 * x * (x * x + y - 11) + 2 * (x + y * y - 7),
          2 * (x * x + y - 11) + 4 * y * (x + y * y - 7)
        ];
      },
      range: [-5, 5]
    }
  };

  var optimizerColors = {
    sgd: 0x4f8fff,
    momentum: 0x22d3a7,
    adam: 0xffa032
  };

  var container = document.querySelector('.gd-canvas-container');
  var surfaceSelect = document.getElementById('surface-select');
  var lrSlider = document.getElementById('lr-slider');
  var lrValue = document.getElementById('lr-value');
  var btnPlay = document.getElementById('btn-play');
  var btnStep = document.getElementById('btn-step');
  var btnReset = document.getElementById('btn-reset');
  var statStep = document.getElementById('stat-step');
  var optSgd = document.getElementById('opt-sgd');
  var optMomentum = document.getElementById('opt-momentum');
  var optAdam = document.getElementById('opt-adam');

  var MESH_SEGMENTS = 128;
  var SURFACE_SIZE = 6;
  var HEIGHT_SCALE = 2.5;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0c10);

  var aspect = container.clientWidth / container.clientHeight;
  var camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
  camera.position.set(5, 6, 5);
  camera.lookAt(0, 0, 0);

  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3;
  controls.maxDistance = 20;
  controls.maxPolarAngle = Math.PI * 0.85;

  var ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);
  var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);

  var surfaceMesh = null;
  var pathObjects = [];
  var markerObjects = [];
  var startMarker = null;

  var state = {
    surface: 'bowl',
    lr: 0.01,
    playing: false,
    stepCount: 0,
    optimizers: [],
    animId: null
  };

  function compressHeight(rawVal, maxLog) {
    var sign = rawVal >= 0 ? 1 : -1;
    return sign * Math.log(1 + Math.abs(rawVal)) * HEIGHT_SCALE / maxLog;
  }

  function domainToWorld(x, y, surf) {
    var s = surfaces[surf || state.surface];
    var lo = s.range[0];
    var hi = s.range[1];
    var half = SURFACE_SIZE / 2;
    var wx = ((x - lo) / (hi - lo)) * SURFACE_SIZE - half;
    var wz = ((y - lo) / (hi - lo)) * SURFACE_SIZE - half;
    var rawVal = s.fn(x, y);
    var wy = compressHeight(rawVal, getMaxLog(s));
    return new THREE.Vector3(wx, wy, wz);
  }

  function worldToDomain(wx, wz) {
    var s = surfaces[state.surface];
    var lo = s.range[0];
    var hi = s.range[1];
    var half = SURFACE_SIZE / 2;
    var x = lo + ((wx + half) / SURFACE_SIZE) * (hi - lo);
    var y = lo + ((wz + half) / SURFACE_SIZE) * (hi - lo);
    return [x, y];
  }

  var maxLogCache = {};
  function getMaxLog(s) {
    var key = state.surface;
    if (maxLogCache[key]) return maxLogCache[key];
    var lo = s.range[0];
    var hi = s.range[1];
    var maxVal = 0;
    for (var i = 0; i <= 64; i++) {
      for (var j = 0; j <= 64; j++) {
        var x = lo + (i / 64) * (hi - lo);
        var y = lo + (j / 64) * (hi - lo);
        var v = Math.log(1 + Math.abs(s.fn(x, y)));
        if (v > maxVal) maxVal = v;
      }
    }
    maxLogCache[key] = maxVal || 1;
    return maxLogCache[key];
  }

  function buildSurface() {
    if (surfaceMesh) {
      scene.remove(surfaceMesh);
      surfaceMesh.geometry.dispose();
      surfaceMesh.material.dispose();
    }

    var s = surfaces[state.surface];
    var lo = s.range[0];
    var hi = s.range[1];
    var maxLog = getMaxLog(s);

    var geo = new THREE.PlaneGeometry(SURFACE_SIZE, SURFACE_SIZE, MESH_SEGMENTS, MESH_SEGMENTS);
    geo.rotateX(-Math.PI / 2);

    var pos = geo.attributes.position;
    var colors = new Float32Array(pos.count * 3);
    var half = SURFACE_SIZE / 2;

    for (var i = 0; i < pos.count; i++) {
      var wx = pos.getX(i);
      var wz = pos.getZ(i);
      var domain = worldToDomain(wx, wz);
      var rawVal = s.fn(domain[0], domain[1]);
      var wy = compressHeight(rawVal, maxLog);
      pos.setY(i, wy);

      var t = maxLog > 0 ? Math.log(1 + Math.abs(rawVal)) / maxLog : 0;
      var r, g, b;
      if (t < 0.25) {
        var p = t / 0.25;
        r = (8 + p * 12) / 255;
        g = (12 + p * 28) / 255;
        b = (40 + p * 80) / 255;
      } else if (t < 0.5) {
        var p = (t - 0.25) / 0.25;
        r = (20 + p * 40) / 255;
        g = (40 + p * 50) / 255;
        b = (120 + p * 55) / 255;
      } else if (t < 0.75) {
        var p = (t - 0.5) / 0.25;
        r = (60 + p * 80) / 255;
        g = (90 + p * 40) / 255;
        b = (175 + p * 40) / 255;
      } else {
        var p = (t - 0.75) / 0.25;
        r = (140 + p * 80) / 255;
        g = (130 + p * 70) / 255;
        b = (215 + p * 40) / 255;
      }
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    var mat = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 40,
      specular: new THREE.Color(0x222244)
    });

    surfaceMesh = new THREE.Mesh(geo, mat);
    scene.add(surfaceMesh);
  }

  function clearPaths() {
    pathObjects.forEach(function (obj) {
      scene.remove(obj);
      obj.geometry.dispose();
      obj.material.dispose();
    });
    pathObjects = [];
    markerObjects.forEach(function (obj) {
      scene.remove(obj);
      obj.geometry.dispose();
      obj.material.dispose();
    });
    markerObjects = [];
    if (startMarker) {
      scene.remove(startMarker);
      startMarker.geometry.dispose();
      startMarker.material.dispose();
      startMarker = null;
    }
  }

  function updatePaths() {
    pathObjects.forEach(function (obj) {
      scene.remove(obj);
      obj.geometry.dispose();
      obj.material.dispose();
    });
    pathObjects = [];
    markerObjects.forEach(function (obj) {
      scene.remove(obj);
      obj.geometry.dispose();
      obj.material.dispose();
    });
    markerObjects = [];

    state.optimizers.forEach(function (opt) {
      if (opt.path.length < 2) return;

      var points = [];
      for (var i = 0; i < opt.path.length; i++) {
        var w = domainToWorld(opt.path[i][0], opt.path[i][1]);
        w.y += 0.03;
        points.push(w);
      }
      var lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      var lineMat = new THREE.LineBasicMaterial({ color: opt.colorHex, linewidth: 2 });
      var line = new THREE.Line(lineGeo, lineMat);
      scene.add(line);
      pathObjects.push(line);

      var last = opt.path[opt.path.length - 1];
      var wLast = domainToWorld(last[0], last[1]);
      wLast.y += 0.05;
      var sphereGeo = new THREE.SphereGeometry(0.06, 16, 16);
      var sphereMat = new THREE.MeshBasicMaterial({ color: opt.colorHex });
      var sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.copy(wLast);
      scene.add(sphere);
      markerObjects.push(sphere);
    });

    if (state.optimizers.length > 0) {
      if (startMarker) {
        scene.remove(startMarker);
        startMarker.geometry.dispose();
        startMarker.material.dispose();
      }
      var first = state.optimizers[0].path[0];
      var wFirst = domainToWorld(first[0], first[1]);
      wFirst.y += 0.05;
      var ringGeo = new THREE.RingGeometry(0.06, 0.1, 24);
      ringGeo.rotateX(-Math.PI / 2);
      var ringMat = new THREE.MeshBasicMaterial({ color: 0xe8e8ed, side: THREE.DoubleSide });
      startMarker = new THREE.Mesh(ringGeo, ringMat);
      startMarker.position.copy(wFirst);
      scene.add(startMarker);
    }
  }

  function createSGD(x0, y0) {
    return {
      name: 'sgd',
      colorHex: optimizerColors.sgd,
      x: x0, y: y0,
      path: [[x0, y0]],
      step: function (lr, grad) {
        this.x -= lr * grad[0];
        this.y -= lr * grad[1];
        this.path.push([this.x, this.y]);
      }
    };
  }

  function createMomentum(x0, y0) {
    return {
      name: 'momentum',
      colorHex: optimizerColors.momentum,
      x: x0, y: y0,
      vx: 0, vy: 0,
      path: [[x0, y0]],
      step: function (lr, grad) {
        this.vx = 0.9 * this.vx - lr * grad[0];
        this.vy = 0.9 * this.vy - lr * grad[1];
        this.x += this.vx;
        this.y += this.vy;
        this.path.push([this.x, this.y]);
      }
    };
  }

  function createAdam(x0, y0) {
    return {
      name: 'adam',
      colorHex: optimizerColors.adam,
      x: x0, y: y0,
      mx: 0, my: 0,
      vx: 0, vy: 0,
      t: 0,
      path: [[x0, y0]],
      step: function (lr, grad) {
        this.t++;
        this.mx = 0.9 * this.mx + 0.1 * grad[0];
        this.my = 0.9 * this.my + 0.1 * grad[1];
        this.vx = 0.999 * this.vx + 0.001 * grad[0] * grad[0];
        this.vy = 0.999 * this.vy + 0.001 * grad[1] * grad[1];
        var mxh = this.mx / (1 - Math.pow(0.9, this.t));
        var myh = this.my / (1 - Math.pow(0.9, this.t));
        var vxh = this.vx / (1 - Math.pow(0.999, this.t));
        var vyh = this.vy / (1 - Math.pow(0.999, this.t));
        this.x -= lr * mxh / (Math.sqrt(vxh) + 1e-8);
        this.y -= lr * myh / (Math.sqrt(vyh) + 1e-8);
        this.path.push([this.x, this.y]);
      }
    };
  }

  function placeOptimizers(x0, y0) {
    clearPaths();
    state.optimizers = [];
    if (optSgd.checked) state.optimizers.push(createSGD(x0, y0));
    if (optMomentum.checked) state.optimizers.push(createMomentum(x0, y0));
    if (optAdam.checked) state.optimizers.push(createAdam(x0, y0));
    state.stepCount = 0;
    statStep.textContent = '0';
  }

  function doStep() {
    var surf = surfaces[state.surface];
    var lo = surf.range[0];
    var hi = surf.range[1];
    var domainSpan = hi - lo;
    var maxStep = domainSpan * 0.02;
    state.optimizers.forEach(function (opt) {
      if (opt.frozen) return;
      var g = surf.grad(opt.x, opt.y);
      var prevX = opt.x;
      var prevY = opt.y;
      opt.step(state.lr, g);
      var dx = opt.x - prevX;
      var dy = opt.y - prevY;
      var stepMag = Math.sqrt(dx * dx + dy * dy);
      if (stepMag > maxStep) {
        opt.x = prevX + dx * maxStep / stepMag;
        opt.y = prevY + dy * maxStep / stepMag;
        if (opt.vx !== undefined) { opt.vx *= 0.1; opt.vy *= 0.1; }
      }
      opt.x = Math.max(lo, Math.min(hi, opt.x));
      opt.y = Math.max(lo, Math.min(hi, opt.y));
      opt.path[opt.path.length - 1] = [opt.x, opt.y];
    });
    state.stepCount++;
    statStep.textContent = state.stepCount;
  }

  var raycaster = new THREE.Raycaster();
  var mouse = new THREE.Vector2();
  var dragStart = new THREE.Vector2();
  var isDragging = false;
  var DRAG_THRESHOLD = 5;

  renderer.domElement.addEventListener('pointerdown', function (e) {
    dragStart.set(e.clientX, e.clientY);
    isDragging = false;
  });

  renderer.domElement.addEventListener('pointermove', function (e) {
    var dx = e.clientX - dragStart.x;
    var dy = e.clientY - dragStart.y;
    if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
      isDragging = true;
    }
  });

  renderer.domElement.addEventListener('pointerup', function (e) {
    if (isDragging) return;

    var rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    if (!surfaceMesh) return;
    var intersects = raycaster.intersectObject(surfaceMesh);
    if (intersects.length > 0) {
      var hit = intersects[0].point;
      var domain = worldToDomain(hit.x, hit.z);
      placeOptimizers(domain[0], domain[1]);
      updatePaths();
      state.playing = true;
      btnPlay.textContent = 'Pause';
    }
  });

  btnPlay.addEventListener('click', function () {
    if (state.optimizers.length === 0) return;
    state.playing = !state.playing;
    btnPlay.textContent = state.playing ? 'Pause' : 'Play';
  });

  btnStep.addEventListener('click', function () {
    if (state.optimizers.length === 0) return;
    state.playing = false;
    btnPlay.textContent = 'Play';
    doStep();
    updatePaths();
  });

  btnReset.addEventListener('click', function () {
    state.playing = false;
    btnPlay.textContent = 'Play';
    clearPaths();
    state.optimizers = [];
    state.stepCount = 0;
    statStep.textContent = '0';
  });

  surfaceSelect.addEventListener('change', function () {
    state.surface = this.value;
    state.playing = false;
    btnPlay.textContent = 'Play';
    clearPaths();
    state.optimizers = [];
    state.stepCount = 0;
    statStep.textContent = '0';
    buildSurface();
  });

  lrSlider.addEventListener('input', function () {
    state.lr = Math.pow(10, parseFloat(this.value));
    lrValue.textContent = state.lr.toFixed(4);
  });

  function onResize() {
    var w = container.clientWidth;
    var h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  window.addEventListener('resize', onResize);

  var stepsPerFrame = 1;
  var frameCounter = 0;

  function animationLoop() {
    requestAnimationFrame(animationLoop);
    controls.update();

    if (state.playing && state.optimizers.length > 0) {
      frameCounter++;
      if (frameCounter % 2 === 0) {
        doStep();
        updatePaths();
        if (state.stepCount >= 500) {
          state.playing = false;
          btnPlay.textContent = 'Play';
        }
      }
    }

    renderer.render(scene, camera);
  }

  buildSurface();
  animationLoop();
})();
