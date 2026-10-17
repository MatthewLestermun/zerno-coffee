// =====================================================
// cups.js — 3D-стаканчики «Зерно» и кофейные зёрна на Three.js
// 1) рисует сцены на первом экране и в блоке «Зерно — это»
// 2) делает картинки стаканчиков и зёрен для карточек (PNG с прозрачным фоном)
// =====================================================

(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGL = (function () {
    try {
      const c = document.createElement('canvas');
      return !!(window.THREE && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  })();

  // Публичный интерфейс для script.js
  const CupArt = { ready: false, images: {}, beans: [], fill: function () {} };
  window.CupArt = CupArt;
  if (!hasGL) { document.documentElement.classList.add('no-gl'); return; }

  // ---------- Расцветки стаканчиков ----------
  const VARIANTS = {
    cream: { body: '#EFE3CF', speck: true, lid: '#2B1E18', sleeve: '#C49A70', ink: '#3A2820', ribs: false },
    choco: { body: '#5E3D2C', speck: false, lid: '#221611', sleeve: '#7B4F37', ink: '#EBCBA8', ribs: true },
    teal: { body: '#7FB4AE', speck: false, lid: '#F1E7DA', sleeve: '#EFE3CF', ink: '#4F8C86', ribs: false },
    kraft: { body: '#D6B38B', speck: true, lid: '#F3EBDF', sleeve: '#3A2820', ink: '#E3B98F', ribs: false },
    hero: { body: '#EFE3CF', speck: true, lid: '#2B1E18', sleeve: '#4A2E22', ink: '#E3B98F', ribs: true }
  };

  // ---------- Текстуры ----------
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  }

  function bodyTex(v) {
    return canvasTex(512, 512, function (g, w, h) {
      g.fillStyle = v.body; g.fillRect(0, 0, w, h);
      if (!v.speck) return;
      for (let i = 0; i < 1400; i++) {
        g.fillStyle = 'rgba(60,38,26,' + (0.25 + Math.random() * 0.5) + ')';
        g.beginPath();
        g.arc(Math.random() * w, Math.random() * h, 0.6 + Math.random() * 1.6, 0, Math.PI * 2);
        g.fill();
      }
    });
  }

  function sleeveTex(v) {
    return canvasTex(2048, 512, function (g, w, h) {
      g.fillStyle = v.sleeve; g.fillRect(0, 0, w, h);
      if (v.ribs) {
        // рифлёный картон
        for (let x = -h; x < w; x += 22) {
          g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 7;
          g.beginPath(); g.moveTo(x, h); g.lineTo(x + h * 0.55, 0); g.stroke();
          g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 3;
          g.beginPath(); g.moveTo(x + 8, h); g.lineTo(x + 8 + h * 0.55, 0); g.stroke();
        }
      }
      g.fillStyle = 'rgba(0,0,0,.12)';
      g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
      // логотип по центру (смотрит в камеру)
      g.fillStyle = v.ink;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '700 118px Unbounded, Manrope, sans-serif';
      g.fillText('ЗЕРНО', w / 2, h / 2 - 20);
      g.font = '600 34px Manrope, sans-serif';
      g.fillText('кофейня · пекарня', w / 2, h / 2 + 76);
    });
  }

  function beanTex() {
    return canvasTex(512, 256, function (g, w, h) {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#6A3D26'); grd.addColorStop(0.5, '#4B2B1B'); grd.addColorStop(1, '#3A2015');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      // бороздка вдоль зерна с двух плоских сторон
      g.strokeStyle = '#1C100A'; g.lineWidth = 9; g.lineCap = 'round';
      [[18, 238], [274, 494]].forEach(function (r) {
        g.beginPath();
        for (let x = r[0]; x <= r[1]; x += 4) {
          const y = h / 2 + Math.sin((x - r[0]) / (r[1] - r[0]) * Math.PI * 2) * 7;
          if (x === r[0]) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
      });
    });
  }

  // ---------- Геометрия ----------
  const BODY_PTS = [];
  // профиль стакана: снизу уже, сверху шире
  BODY_PTS.push(new THREE.Vector2(0, -1.25));
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    BODY_PTS.push(new THREE.Vector2(0.76 + t * 0.24, -1.25 + t * 2.41));
  }
  const radiusAt = function (y) { return 0.76 + (y + 1.25) / 2.41 * 0.24; };

  const LID_PTS = [
    [0, 1.53], [0.5, 1.53], [0.6, 1.5], [0.88, 1.45], [0.96, 1.38],
    [1.05, 1.35], [1.07, 1.28], [1.05, 1.19], [1.0, 1.16]
  ].map(function (p) { return new THREE.Vector2(p[0], p[1]); });

  const geo = {
    body: new THREE.LatheGeometry(BODY_PTS, 72),
    rim: new THREE.TorusGeometry(1.0, 0.035, 12, 72),
    lid: new THREE.LatheGeometry(LID_PTS, 72),
    sleeve: new THREE.CylinderGeometry(radiusAt(0.55) + 0.02, radiusAt(-0.55) + 0.02, 1.1, 96, 1, true, Math.PI, Math.PI * 2),
    coffee: new THREE.CircleGeometry(0.97, 48),
    hole: new THREE.CylinderGeometry(0.1, 0.1, 0.03, 20),
    bean: (function () { const g = new THREE.SphereGeometry(1, 40, 28); g.scale(1, 0.68, 0.5); return g; })(),
    drop: new THREE.SphereGeometry(1, 14, 10)
  };

  const lin = function (hex) { return new THREE.Color(hex).convertSRGBToLinear(); };
  const texCache = {};
  function mat(key, make) { return texCache[key] || (texCache[key] = make()); }

  // Стаканчик: { group, lid }
  function makeCup(name) {
    const v = VARIANTS[name];
    const group = new THREE.Group();
    const bodyMat = mat('body-' + name, function () {
      return new THREE.MeshStandardMaterial({ map: bodyTex(v), roughness: 0.55, side: THREE.DoubleSide });
    });
    group.add(new THREE.Mesh(geo.body, bodyMat));

    const rim = new THREE.Mesh(geo.rim, bodyMat);
    rim.rotation.x = Math.PI / 2; rim.position.y = 1.16;
    group.add(rim);

    const coffee = new THREE.Mesh(geo.coffee, mat('coffee', function () {
      return new THREE.MeshStandardMaterial({ color: lin('#3B2014'), roughness: 0.15 });
    }));
    coffee.rotation.x = -Math.PI / 2; coffee.position.y = 1.08;
    group.add(coffee);

    const sleeve = new THREE.Mesh(geo.sleeve, mat('sleeve-' + name, function () {
      return new THREE.MeshStandardMaterial({ map: sleeveTex(v), roughness: 0.85 });
    }));
    group.add(sleeve);

    const lid = new THREE.Group();
    const lidMat = mat('lid-' + name, function () {
      return new THREE.MeshStandardMaterial({ color: lin(v.lid), roughness: 0.32, side: THREE.DoubleSide });
    });
    lid.add(new THREE.Mesh(geo.lid, lidMat));
    const hole = new THREE.Mesh(geo.hole, mat('hole', function () {
      return new THREE.MeshStandardMaterial({ color: lin('#120a07'), roughness: 0.6 });
    }));
    hole.scale.set(1.9, 1, 1); hole.position.set(0, 1.53, 0.36);
    lid.add(hole);
    group.add(lid);

    return { group: group, lid: lid };
  }

  const beanMat = new THREE.MeshStandardMaterial({ map: beanTex(), roughness: 0.42 });
  function makeBean() { return new THREE.Mesh(geo.bean, beanMat); }

  function addLights(scene) {
    scene.add(new THREE.HemisphereLight(0xfff1e0, 0x2b1d17, 0.85));
    const key = new THREE.DirectionalLight(0xffe2c2, 1.5); key.position.set(3, 4, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffc48f, 1.3); rim.position.set(-4, 2.5, -3); scene.add(rim);
    const fill = new THREE.PointLight(0x6ba7a1, 0.6, 20); fill.position.set(-3, -1, 4); scene.add(fill);
  }

  function makeRenderer(canvas, opts) {
    const r = new THREE.WebGLRenderer(Object.assign({ canvas: canvas, alpha: true, antialias: true }, opts || {}));
    r.outputEncoding = THREE.sRGBEncoding;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.setClearColor(0x000000, 0);
    return r;
  }

  // ---------- Картинки для карточек ----------
  function generateImages() {
    const r = makeRenderer(document.createElement('canvas'), { preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    const scene = new THREE.Scene();
    addLights(scene);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);

    // стаканчики 320×400
    r.setSize(320, 400, false);
    cam.aspect = 320 / 400; cam.position.set(0, 0.5, 7.4); cam.lookAt(0, 0.12, 0); cam.updateProjectionMatrix();
    Object.keys(VARIANTS).forEach(function (name) {
      const cup = makeCup(name);
      cup.group.rotation.set(0.14, 0, 0.03);
      scene.add(cup.group);
      r.render(scene, cam);
      CupArt.images[name] = r.domElement.toDataURL('image/png');
      scene.remove(cup.group);
    });

    // зёрна 240×240 в разных поворотах
    r.setSize(240, 240, false);
    cam.aspect = 1; cam.position.set(0, 0, 4.2); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
    const poses = [[0.3, 0.2, 0.6], [1.2, 0.4, -0.4], [-0.2, 2.6, 1.1], [0.8, -0.6, 2.2], [-0.9, 0.3, -1.2], [0.1, 0.1, 0.1]];
    const bean = makeBean();
    scene.add(bean);
    poses.forEach(function (p) {
      bean.rotation.set(p[0], p[1], p[2]);
      r.render(scene, cam);
      CupArt.beans.push(r.domElement.toDataURL('image/png'));
    });
    r.dispose();
    r.forceContextLoss();
  }

  CupArt.fill = function (root) {
    if (!CupArt.ready) return;
    (root || document).querySelectorAll('img[data-cup]').forEach(function (img) {
      const src = CupArt.images[img.dataset.cup];
      if (src && img.src !== src) img.src = src;
    });
    (root || document).querySelectorAll('img[data-bean]').forEach(function (img) {
      const src = CupArt.beans[+img.dataset.bean % CupArt.beans.length];
      if (src && !img.getAttribute('src')) img.src = src;
    });
  };

  // ---------- Общая обвязка для живых сцен ----------
  function liveScene(canvas, setup) {
    const renderer = makeRenderer(canvas);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new THREE.Scene();
    addLights(scene);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
    const api = setup(scene, cam);
    let visible = true;
    let last = performance.now();

    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      if (api.resize) api.resize(w, h);
      cam.updateProjectionMatrix();
      renderer.render(scene, cam);
    }
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(canvas);

    function loop(now) {
      requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!visible) return;
      api.tick(now / 1000, dt);
      renderer.render(scene, cam);
    }
    resize();
    if (reduce) { api.tick(0, 0); renderer.render(scene, cam); }
    else requestAnimationFrame(loop);
  }

  // Мышь для параллакса
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', function (e) {
    mouse.tx = e.clientX / innerWidth - 0.5;
    mouse.ty = e.clientY / innerHeight - 0.5;
  }, { passive: true });

  // ---------- Первый экран: два стаканчика, слетевшая крышка, брызги ----------
  function heroScene(scene, cam) {
    const root = new THREE.Group();
    scene.add(root);

    const back = makeCup('choco');
    back.group.position.set(-1.05, -0.35, -0.9);
    back.group.rotation.set(0.08, 0.5, 0.16);
    back.group.scale.setScalar(0.92);
    root.add(back.group);

    const front = makeCup('cream');
    front.group.position.set(0.95, -0.6, 0.5);
    front.group.rotation.set(0.14, -0.35, -0.2);
    root.add(front.group);
    // крышка «слетела» с переднего стаканчика
    front.lid.position.set(-0.25, 0.55, -0.1);
    front.lid.rotation.set(0.35, 0, 0.5);
    front.lid.scale.setScalar(0.92);

    // Брызги кофе
    const COUNT = 90;
    const drops = new THREE.InstancedMesh(geo.drop, new THREE.MeshStandardMaterial({ color: lin('#5A3018'), roughness: 0.12, metalness: 0.05 }), COUNT);
    drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    root.add(drops);
    const P = [];
    const dummy = new THREE.Object3D();
    const emit = new THREE.Vector3();
    function spawn(p, initial) {
      // точка выплеска — верх переднего стаканчика
      front.group.localToWorld(emit.set((Math.random() - 0.5) * 1.4, 1.12, (Math.random() - 0.5) * 1.2));
      root.worldToLocal(emit);
      p.pos = emit.clone();
      const a = Math.random() * Math.PI * 2;
      const s = 0.6 + Math.random() * 1.3;
      p.vel = new THREE.Vector3(Math.cos(a) * s * 0.9 - 0.25, 2.2 + Math.random() * 2.2, Math.sin(a) * s * 0.6);
      p.size = 0.03 + Math.random() * 0.075;
      p.life = initial ? Math.random() * 1.4 : 0;
      p.max = 1.1 + Math.random() * 0.6;
    }
    for (let i = 0; i < COUNT; i++) { const p = {}; spawn(p, true); P.push(p); }

    // Зёрна вокруг
    const beans = [];
    [[-2.5, 1.4, -1.5], [2.6, 1.9, -1.2], [-2.2, -1.9, 0.6], [2.4, -1.5, 1.2], [0.1, 2.3, -2.2], [-0.4, -2.2, 1.6]].forEach(function (p, i) {
      const b = makeBean();
      b.position.set(p[0], p[1], p[2]);
      b.scale.setScalar(0.22 + (i % 3) * 0.05);
      b.userData = { base: b.position.clone(), sp: 0.4 + Math.random() * 0.5, ph: Math.random() * 6 };
      b.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      root.add(b); beans.push(b);
    });

    return {
      resize: function (w, h) {
        const narrow = w / h < 0.9;
        cam.position.set(0, 0.35, narrow ? 11 : 9.2);
        cam.lookAt(0, 0.2, 0);
      },
      tick: function (t, dt) {
        mouse.x += (mouse.tx - mouse.x) * 0.05;
        mouse.y += (mouse.ty - mouse.y) * 0.05;
        root.rotation.y = mouse.x * 0.35;
        root.rotation.x = mouse.y * 0.15;

        back.group.position.y = -0.35 + Math.sin(t * 0.8) * 0.08;
        back.group.rotation.y = 0.5 + Math.sin(t * 0.4) * 0.12;
        front.group.position.y = -0.6 + Math.sin(t * 0.8 + 1.5) * 0.08;
        front.lid.position.y = 0.55 + Math.sin(t * 1.1) * 0.07;
        front.lid.rotation.z = 0.55 + Math.sin(t * 0.9) * 0.06;

        for (let i = 0; i < COUNT; i++) {
          const p = P[i];
          p.life += dt;
          if (p.life > p.max) spawn(p, false);
          p.vel.y -= 6.5 * dt;
          p.pos.addScaledVector(p.vel, dt);
          const fade = Math.min(1, (p.max - p.life) * 4) * Math.min(1, p.life * 10 + 0.2);
          dummy.position.copy(p.pos);
          // капли вытягиваются по направлению полёта
          dummy.lookAt(p.pos.x + p.vel.x, p.pos.y + p.vel.y, p.pos.z + p.vel.z);
          const s = p.size * Math.max(fade, 0.01);
          dummy.scale.set(s, s, s * (1 + p.vel.length() * 0.25));
          dummy.updateMatrix();
          drops.setMatrixAt(i, dummy.matrix);
        }
        drops.instanceMatrix.needsUpdate = true;

        beans.forEach(function (b) {
          const u = b.userData;
          b.position.y = u.base.y + Math.sin(t * u.sp + u.ph) * 0.15;
          b.rotation.x += dt * u.sp * 0.5;
          b.rotation.y += dt * u.sp * 0.4;
        });
      }
    };
  }

  // ---------- «Зерно — это»: стаканчик крутится при прокрутке ----------
  function aboutScene(scene, cam) {
    const canvas = document.getElementById('about-canvas');
    const cup = makeCup('hero');
    scene.add(cup.group);
    const beans = [];
    for (let i = 0; i < 5; i++) {
      const b = makeBean();
      b.scale.setScalar(0.2 + (i % 2) * 0.06);
      b.userData = { a: (i / 5) * Math.PI * 2, r: 1.75 + (i % 2) * 0.25, y: -0.9 + i * 0.45 };
      scene.add(b); beans.push(b);
    }
    return {
      resize: function () { cam.position.set(0, 0.6, 8.6); cam.lookAt(0, 0.1, 0); },
      tick: function (t, dt) {
        const r = canvas.getBoundingClientRect();
        const k = 1 - (r.top + r.height / 2) / (innerHeight + r.height); // 0..1 по мере прокрутки
        cup.group.rotation.y = Math.sin(k * Math.PI * 2.2) * 0.75; // покачивается, логотип остаётся спереди
        cup.group.rotation.z = Math.sin(t * 0.6) * 0.04;
        cup.group.position.y = Math.sin(t * 0.9) * 0.06;
        beans.forEach(function (b) {
          const u = b.userData;
          const a = u.a + t * 0.35 + k * 2;
          b.position.set(Math.cos(a) * u.r, u.y + Math.sin(t + u.a) * 0.1, Math.sin(a) * u.r * 0.6);
          b.rotation.x += dt * 0.6; b.rotation.z += dt * 0.4;
        });
      }
    };
  }

  // ---------- Старт: ждём шрифт, чтобы логотип на стаканчиках был фирменным ----------
  const fontReady = document.fonts && document.fonts.load
    ? Promise.race([document.fonts.load('700 150px Unbounded'), new Promise(function (r) { setTimeout(r, 1800); })])
    : Promise.resolve();

  fontReady.catch(function () {}).then(function () {
    try {
      generateImages();
      CupArt.ready = true;
      CupArt.fill(document);
      const hero = document.getElementById('hero-canvas');
      const about = document.getElementById('about-canvas');
      if (hero) liveScene(hero, heroScene);
      if (about) liveScene(about, aboutScene);
      document.dispatchEvent(new Event('cupart:ready'));
    } catch (e) {
      document.documentElement.classList.add('no-gl');
    }
  });
})();
