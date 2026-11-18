/* LOXEN CUT: page effects. No libraries.
 *
 *   LoxenFX.stars()                 a slowly drifting, twinkling starfield behind the whole page, with the odd
 *                                   shooting star. One fixed canvas, about 30 frames a second, paused when hidden.
 *   LoxenFX.timecode(el, from)      a running studio timecode (HH:MM:SS:FF at 24 frames a second)
 *   LoxenFX.parallax(selector)      elements with data-depth="0.2" float gently against the mouse
 *   LoxenFX.count(el)               counts a number up from 0 the first time it scrolls into view
 *
 * With "reduce motion" switched on in the system settings everything is drawn once and holds still. */
(function () {
  "use strict";
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function stars(opts) {
    opts = Object.assign({ density: 1, zIndex: 0 }, opts || {});
    if (document.getElementById("lx-stars")) return;
    const c = document.createElement("canvas");
    c.id = "lx-stars";
    c.setAttribute("aria-hidden", "true");
    c.style.cssText = `position:fixed;inset:0;width:100vw;height:100vh;z-index:${opts.zIndex};pointer-events:none;display:block`;
    document.body.prepend(c);
    const g = c.getContext("2d");
    let W = 0, H = 0, dpr = 1, list = [], shoot = null, nextShoot = performance.now() + 2500;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    function build() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(W * H / 4200 * opts.density);
      list = [];
      for (let i = 0; i < n; i++) {
        const layer = Math.random() < 0.72 ? 0 : Math.random() < 0.8 ? 1 : 2;   // far, middle, near
        list.push({
          x: Math.random() * W, y: Math.random() * H, layer,
          r: layer === 0 ? 0.35 + Math.random() * 0.45 : layer === 1 ? 0.7 + Math.random() * 0.6 : 1.1 + Math.random() * 0.8,
          a: layer === 0 ? 0.25 + Math.random() * 0.35 : 0.45 + Math.random() * 0.45,
          tw: 0.6 + Math.random() * 2.2, ph: Math.random() * 6.28,
          tint: Math.random() < 0.18 ? "205,214,232" : Math.random() < 0.1 ? "232,226,214" : "238,239,242",
        });
      }
    }
    const SPEED = [0.006, 0.014, 0.03];      // pixels per millisecond, by layer: far stars barely move
    const PAR = [4, 10, 22];                 // how far each layer leans with the mouse

    function frame(now, dt) {
      g.clearRect(0, 0, W, H);
      mouse.x += (mouse.tx - mouse.x) * 0.03; mouse.y += (mouse.ty - mouse.y) * 0.03;
      const sy = (window.scrollY || 0);
      for (const s of list) {
        s.x -= SPEED[s.layer] * dt; s.y -= SPEED[s.layer] * dt * 0.28;
        if (s.x < -4) s.x += W + 8; if (s.y < -4) s.y += H + 8;
        let x = s.x + mouse.x * PAR[s.layer], y = (s.y - sy * 0.04 * (s.layer + 1)) % (H + 8);
        if (y < -4) y += H + 8;
        const tw = still ? 1 : 0.55 + 0.45 * Math.sin(now / 1000 * s.tw + s.ph);
        const a = s.a * tw;
        if (s.layer === 2) {         // the nearest stars get a soft glow and a tiny cross flare
          const grd = g.createRadialGradient(x, y, 0, x, y, s.r * 5);
          grd.addColorStop(0, `rgba(${s.tint},${a * 0.5})`); grd.addColorStop(1, `rgba(${s.tint},0)`);
          g.fillStyle = grd; g.fillRect(x - s.r * 5, y - s.r * 5, s.r * 10, s.r * 10);
          g.fillStyle = `rgba(${s.tint},${a * 0.35})`;
          g.fillRect(x - s.r * 4, y - 0.25, s.r * 8, 0.5); g.fillRect(x - 0.25, y - s.r * 4, 0.5, s.r * 8);
        }
        g.beginPath(); g.arc(x, y, s.r, 0, 6.2832);
        g.fillStyle = `rgba(${s.tint},${a})`; g.fill();
      }
      // a shooting star every few seconds
      if (!still) {
        if (!shoot && now > nextShoot) {
          const fromLeft = Math.random() < 0.5;
          shoot = { x: fromLeft ? Math.random() * W * 0.5 : W * 0.5 + Math.random() * W * 0.5, y: Math.random() * H * 0.45,
                    vx: (fromLeft ? 1 : -1) * (0.55 + Math.random() * 0.35), vy: 0.22 + Math.random() * 0.15, life: 0, max: 900 + Math.random() * 500 };
        }
        if (shoot) {
          shoot.life += dt; shoot.x += shoot.vx * dt; shoot.y += shoot.vy * dt;
          const k = shoot.life / shoot.max, fade = Math.sin(Math.min(1, k) * Math.PI);
          const len = 140, tx = shoot.x - shoot.vx * len / 0.7, ty = shoot.y - shoot.vy * len / 0.7;
          const grd = g.createLinearGradient(shoot.x, shoot.y, tx, ty);
          grd.addColorStop(0, `rgba(245,245,242,${0.9 * fade})`); grd.addColorStop(1, "rgba(245,245,242,0)");
          g.strokeStyle = grd; g.lineWidth = 1.2; g.lineCap = "round";
          g.beginPath(); g.moveTo(shoot.x, shoot.y); g.lineTo(tx, ty); g.stroke();
          g.beginPath(); g.arc(shoot.x, shoot.y, 1.4, 0, 6.2832); g.fillStyle = `rgba(255,255,255,${fade})`; g.fill();
          if (k >= 1) { shoot = null; nextShoot = now + 4500 + Math.random() * 7000; }
        }
      }
    }
    let last = performance.now(), raf = 0;
    function loop(now) {
      raf = 0;
      if (document.hidden) return;
      const dt = Math.min(64, now - last);
      if (dt < 30) { raf = requestAnimationFrame(loop); return; }
      last = now; frame(now, dt);
      if (!still) raf = requestAnimationFrame(loop);
    }
    build(); frame(performance.now(), 0);
    if (!still) raf = requestAnimationFrame(loop);
    addEventListener("resize", () => { build(); frame(performance.now(), 0); });
    addEventListener("pointermove", e => { mouse.tx = (e.clientX / innerWidth) * 2 - 1; mouse.ty = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
    document.addEventListener("visibilitychange", () => { last = performance.now(); if (!raf && !still) raf = requestAnimationFrame(loop); });
  }

  function timecode(el, from) {
    if (!el) return;
    const t0 = performance.now() - (from || 0) * 1000;
    const p = n => String(n).padStart(2, "0");
    const tick = () => {
      if (!el.isConnected) return;
      const s = (performance.now() - t0) / 1000;
      el.textContent = `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(Math.floor(s) % 60)}:${p(Math.floor(s * 24) % 24)}`;
      if (!still) setTimeout(tick, 1000 / 24);
    };
    tick();
  }

  function parallax(sel) {
    if (still) return;
    const els = [...document.querySelectorAll(sel)];
    if (!els.length) return;
    let tx = 0, ty = 0, x = 0, y = 0, on = false;
    addEventListener("pointermove", e => { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; if (!on) { on = true; requestAnimationFrame(step); } }, { passive: true });
    function step() {
      x += (tx - x) * 0.06; y += (ty - y) * 0.06;
      for (const el of els) { const d = parseFloat(el.dataset.depth || "0.2") * 60; el.style.translate = `${(-x * d).toFixed(2)}px ${(-y * d).toFixed(2)}px`; }
      if (Math.abs(tx - x) + Math.abs(ty - y) > 0.001) requestAnimationFrame(step); else on = false;
    }
  }

  function count(el) {
    if (!el) return;
    const end = parseFloat(el.dataset.to || el.textContent) || 0, dec = (el.dataset.to || "").includes(".") ? 1 : 0;
    const fmt = v => v.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (still) { el.textContent = fmt(end); return; }
    el.textContent = fmt(0);
    const io = new IntersectionObserver(es => {
      if (!es[0].isIntersecting) return; io.disconnect();
      const t0 = performance.now(), dur = 1400;
      const step = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4); el.textContent = fmt(end * e); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
    io.observe(el);
  }

  window.LoxenFX = { stars, timecode, parallax, count };
})();
