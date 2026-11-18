/* LOXEN CUT: interface sounds. No audio files: every sound is made live with the Web Audio API, so nothing to
 * download or license. They are short and quiet on purpose, in the spirit of macOS system sounds.
 *
 *   LoxenSound.play("tap")        a soft glass tick: buttons
 *   LoxenSound.play("select")     a lighter, higher tick: sidebar items, tabs
 *   LoxenSound.play("press")      a soft low "thock" with a glass ring: primary buttons
 *   LoxenSound.play("toggle")     a two-step tick-tock: switches and checkboxes
 *   LoxenSound.play("open")       a menu or dialog opening
 *   LoxenSound.play("close")      ...and closing
 *   LoxenSound.play("send")       a job sent off (Make clips)
 *   LoxenSound.play("success")    something worked
 *   LoxenSound.play("error")      something didn't
 *   LoxenSound.play("notify")     a notification: clips ready, recording ended
 *
 *   LoxenSound.on() / LoxenSound.set(true|false)   sounds on or off, remembered in this browser
 *   LoxenSound.wire(root)          click sounds for every button, link-button, tab and switch inside root
 *
 * Browsers only allow sound after the person has clicked or typed on the page, so the first sound waits for that. */
(function () {
  "use strict";
  const KEY = "lx-sound";
  let ctx = null, master = null, last = {};

  const on = () => { try { return localStorage.getItem(KEY) !== "off"; } catch (e) { return true; } };
  const set = v => { try { localStorage.setItem(KEY, v ? "on" : "off"); } catch (e) {} };

  function audio() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();          // keeps overlapping sounds from ever getting harsh
    comp.threshold.value = -18; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = 1.8;   // +6 dB louder than before (Harshit asked)
    master.connect(comp).connect(ctx.destination);
    return ctx;
  }

  // one sine/triangle note with a quick attack and a smooth fall
  function tone(f, at, len, vol, type, glideTo) {
    const c = ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(f, at);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, at + len * 0.8);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    o.connect(g).connect(master); o.start(at); o.stop(at + len + 0.02);
  }
  // a tiny burst of filtered noise: the "physical" part of a click
  let noiseBuf = null;
  function noise(at, len, vol, freq, q) {
    const c = ctx;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q || 1.2;
    g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    s.connect(f).connect(g).connect(master); s.start(at); s.stop(at + len + 0.02);
  }
  function sweep(at, len, vol, from, to) {          // an airy whoosh, for menus and sending
    const c = ctx;
    if (!noiseBuf) noise(at, 0.001, 0.0001, 1000);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf; f.type = "bandpass"; f.Q.value = 0.9;
    f.frequency.setValueAtTime(from, at); f.frequency.exponentialRampToValueAtTime(to, at + len);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + len * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    s.connect(f).connect(g).connect(master); s.start(at); s.stop(at + len + 0.02);
  }

  // a short decaying note shaped like struck glass: a fast attack and a bright, clean fall
  function ping(f, at, len, vol) {
    tone(f, at, len, vol);
    tone(f * 2.76, at, len * 0.45, vol * 0.28);      // an inharmonic overtone: what makes it sound like glass
  }
  // a soft low "thock": the body of a key or a haptic tap, felt more than heard
  function thock(at, vol) {
    tone(165, at, 0.07, vol, "sine", 105);
    noise(at, 0.012, vol * 0.9, 1400, 0.8);
  }

  const SOUNDS = {
    // clicks, in the spirit of the glass buttons: soft, short, never harsh
    tap:     t => { noise(t, 0.008, 0.1, 6500, 1.8); ping(2350, t, 0.05, 0.074); },
    select:  t => { noise(t, 0.006, 0.09, 7500, 2); ping(2900, t, 0.04, 0.064); },
    press:   t => { thock(t, 0.13); ping(1760, t + 0.004, 0.09, 0.048); },
    toggle:  t => { thock(t, 0.1); ping(2100, t, 0.03, 0.044); ping(2800, t + 0.05, 0.04, 0.04); },
    open:    t => { sweep(t, 0.16, 0.07, 900, 3200); tone(620, t, 0.12, 0.042, "sine", 880); },
    close:   t => { sweep(t, 0.12, 0.049, 2800, 900); tone(760, t, 0.09, 0.0308, "sine", 560); },
    send:    t => { sweep(t, 0.32, 0.105, 500, 4200); tone(784, t + 0.05, 0.16, 0.06, "triangle", 1046.5); tone(1568, t + 0.2, 0.35, 0.045); },
    success: t => { tone(1046.5, t, 0.28, 0.08, "triangle"); tone(1568, t + 0.09, 0.42, 0.072, "triangle"); },
    error:   t => { tone(392, t, 0.13, 0.075, "triangle"); tone(311, t + 0.12, 0.2, 0.075, "triangle"); },
    notify:  t => {                                 // a three-note glass chime with soft overtones
      [[1318.5, 0], [1760, 0.12], [2637, 0.24]].forEach(([f, d]) => {
        tone(f, t + d, 0.9, 0.08); tone(f * 2.01, t + d, 0.45, 0.0192); tone(f * 0.5, t + d, 0.6, 0.0192);
      });
    },
  };

  function play(name) {
    if (!on() || !SOUNDS[name]) return;
    const now = performance.now();
    if (now - (last[name] || 0) < 45) return;        // never machine-gun the same sound
    last[name] = now;
    try { const c = audio(); if (!c) return; SOUNDS[name](c.currentTime + 0.005); } catch (e) {}
  }

  // click sounds for a whole page, decided by what was pressed
  function wire(root) {
    (root || document).addEventListener("pointerdown", e => {
      if (e.button !== 0) return;
      const el = e.target.closest("button, a.btn, [role=tab], [role=menuitem], summary, .nav-item, input[type=checkbox], input[type=radio], select, .tab, .chip, .seg button");
      if (!el || el.disabled || el.getAttribute("aria-disabled") === "true" || el.closest("[data-silent]")) return;
      if (el.matches("input[type=checkbox], input[type=radio], [role=switch]")) return play("toggle");
      if (el.matches(".nav-item, [role=tab], .tab, .tabbtn, .seg button, .chip")) return play("select");
      if (el.matches(".primary, .btn.primary")) return play("press");
      play("tap");
    }, { capture: true, passive: true });
    // make the first sound possible as soon as the person interacts
    const unlock = () => { if (on()) audio(); removeEventListener("pointerdown", unlock, true); removeEventListener("keydown", unlock, true); };
    addEventListener("pointerdown", unlock, true); addEventListener("keydown", unlock, true);
  }

  window.LoxenSound = { play, on, set, wire };
})();
