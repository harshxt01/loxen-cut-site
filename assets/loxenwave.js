/* LOXEN CUT: the light horizon behind the landing page.
 *
 * One small WebGL program, no libraries. The curved edge of a dark planet sits low in the frame, lit from behind
 * by a blue glow. Above it, slow ribbons of light drift like an aurora, and a silver highlight travels along the
 * rim. Everything is drawn in the fragment shader; where it is dark the canvas is see-through, so the starfield
 * behind the page still shows.
 *
 *   LoxenWave.mount(element, {horizon: 0.36, strength: 1})
 *
 * horizon   how high the planet's edge reaches, as a share of the element's height from the bottom
 * strength  1 = full brightness, lower = quieter
 *
 * It renders below full resolution, about 30 frames a second, and pauses when the tab is hidden or the element is
 * off screen. With "reduce motion" switched on it draws one still frame. Without WebGL nothing is drawn. */
(function () {
  "use strict";

  const VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";

  const FRAG = `
precision highp float;
uniform vec2 R;      // canvas size in pixels
uniform float T;     // time in seconds
uniform vec2 M;      // mouse, -1..1, eased
uniform float H;     // horizon height, 0..1 from the bottom
uniform float S;     // strength
uniform float V;     // violet: 0 = the website's blue aurora, 1 = the app's violet one
uniform float G;     // gold: the app's golden-hour horizon (champagne glow, warm aurora, a silver rim)

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * R) / R.y;          // centred, y up, 1 = the canvas height
  uv += M * vec2(0.012, -0.008);                        // a whisper of parallax
  float t = T;

  // the planet: a huge circle whose top edge sits at the horizon
  float rad = 1.35;
  vec2 c = vec2(0.0, (H - 0.5) - rad);
  vec2 q = uv - c;
  float d = length(q) - rad;                            // > 0 above the planet, < 0 inside it

  // where along the rim we are (0 = the top), and a highlight that sweeps slowly from side to side
  float ang = atan(q.x, q.y);
  float sweep = exp(-pow((ang - 0.55 * sin(t * 0.11)) * 2.6, 2.0));

  vec3 deep = vec3(0.02, 0.05, 0.16);                   // midnight navy
  vec3 blue = vec3(0.10, 0.42, 1.00);                   // LOXEN blue
  vec3 cyan = mix(vec3(0.45, 0.78, 1.00), vec3(0.72, 0.52, 1.00), V);
  blue = mix(blue, vec3(0.42, 0.26, 1.00), V * 0.55);
  blue = mix(blue, vec3(1.00, 0.66, 0.30), G * 0.85);
  cyan = mix(cyan, vec3(1.00, 0.86, 0.58), G);
  deep = mix(deep, vec3(0.13, 0.06, 0.02), G);
  vec3 silver = vec3(0.86, 0.90, 0.97);

  vec3 col = vec3(0.0);

  // atmosphere: a blue glow that rises off the rim and fades into the dark
  float above = max(d, 0.0);
  col += blue * 0.6 * exp(-above * 6.5) * (0.55 + 0.45 * sweep);
  col += deep * 0.9 * exp(-above * 3.2);

  // the aurora: domain-warped noise, stretched along the rim, drifting
  vec2 p = vec2(ang * 2.2, above * 3.0);
  vec2 w1 = vec2(fbm(p + vec2(0.0, t * 0.035)), fbm(p + vec2(5.2, 1.3) - t * 0.025));
  vec2 w2 = vec2(fbm(p + 3.5 * w1 + vec2(1.7, 9.2) + t * 0.05), fbm(p + 3.5 * w1 + vec2(8.3, 2.8) - t * 0.04));
  float f = fbm(p + 3.0 * w2);
  float ribbons = smoothstep(0.45, 0.95, f) * exp(-above * 3.2) * smoothstep(-0.01, 0.06, d);
  col += mix(blue, cyan, w2.x) * ribbons * 0.9;
  col += silver * pow(ribbons, 3.0) * 0.6;

  // the rim: a thin bright line of light, silver where the highlight passes
  float rim = exp(-abs(d) * 140.0);
  float halo = exp(-abs(d) * 28.0);
  col += mix(blue, silver, sweep) * rim * (0.9 + 1.2 * sweep);
  col += blue * halo * 0.35 * (0.6 + 0.6 * sweep);

  // the planet's night side: almost black, with a faint blue edge just inside the rim
  if (d < 0.0) {
    float inside = -d;
    col = blue * 0.22 * exp(-inside * 22.0) + rim * mix(blue, silver, sweep) * (0.9 + sweep);
    col += vec3(0.01, 0.015, 0.03) * fbm(q * 3.0 + t * 0.01);
  }

  // keep the corners and the very top dark, so the words above always read
  float vig = smoothstep(1.25, 0.25, length(uv * vec2(0.75, 1.0)));
  col *= mix(0.55, 1.0, vig);

  col *= S;
  col = 1.0 - exp(-col * 1.35);                         // soft highlights instead of hard clipping
  float a = clamp(max(col.r, max(col.g, col.b)) * 1.25 + (d < 0.0 ? 1.0 : 0.0), 0.0, 1.0);
  gl_FragColor = vec4(col, a);                          // premultiplied: dark sky lets the stars through
}`;

  function mount(el, opts) {
    opts = Object.assign({ horizon: 0.36, strength: 1, violet: 0, gold: 0 }, opts || {});
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity 1.8s cubic-bezier(.2,.7,.2,1);pointer-events:none";
    let gl;
    try { gl = canvas.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: "low-power" }); } catch (e) { gl = null; }
    if (!gl) return null;

    function shader(type, src) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    const prog = gl.createProgram();
    try {
      gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    } catch (e) { return null; }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {};
    ["R", "T", "M", "H", "S", "V", "G"].forEach(k => U[k] = gl.getUniformLocation(prog, k));
    gl.clearColor(0, 0, 0, 0);

    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.prepend(canvas);

    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let visible = true, raf = 0, last = 0;
    const t0 = performance.now();

    function size() {
      const q = Math.min(window.devicePixelRatio || 1, 2) * (innerWidth < 760 ? 0.5 : 0.7);   // soft light needs few pixels
      const w = Math.max(1, Math.round(el.clientWidth * q)), h = Math.max(1, Math.round(el.clientHeight * q));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    }
    function draw(sec) {
      size();
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.R, canvas.width, canvas.height);
      gl.uniform1f(U.T, sec);
      gl.uniform2f(U.M, mouse.x, mouse.y);
      // on a tall phone screen the horizon sits a little lower, below the link box
      gl.uniform1f(U.H, innerWidth < 760 ? opts.horizon * 0.62 : opts.horizon);
      gl.uniform1f(U.S, opts.strength);
      gl.uniform1f(U.V, opts.violet);
      gl.uniform1f(U.G, opts.gold);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      canvas.style.opacity = "1";
    }
    function frame(now) {
      raf = 0;
      if (!el.isConnected || !visible || document.hidden) return;
      if (now - last < 30) { raf = requestAnimationFrame(frame); return; }
      last = now;
      mouse.x += (mouse.tx - mouse.x) * 0.04; mouse.y += (mouse.ty - mouse.y) * 0.04;
      draw(still ? 20 : (now - t0) / 1000 + 20);
      if (!still) raf = requestAnimationFrame(frame);
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    addEventListener("pointermove", e => { mouse.tx = (e.clientX / innerWidth) * 2 - 1; mouse.ty = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
    addEventListener("resize", kick);
    document.addEventListener("visibilitychange", kick);
    try { new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); }).observe(el); } catch (e) {}
    kick();
    return canvas;
  }

  window.LoxenWave = { mount };
})();
