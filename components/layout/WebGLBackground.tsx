"use client";

import { useEffect, useRef } from "react";

/**
 * Custom WebGL aurora background (three.js, hand-written shader).
 *
 * Replaces the old Vanta clouds effect. Designed to never "bug out":
 *  - DPR capped + renders at 0.75x resolution (it's a soft gradient — invisible loss)
 *  - pauses rendering when the tab is hidden
 *  - prefers-reduced-motion → renders a single static frame
 *  - recovers from WebGL context loss
 *  - full cleanup on unmount (no leaked contexts on hot reload / navigation)
 */

const VERT = /* glsl */ `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2  uRes;
  uniform vec2  uMouse;

  // ── value noise + fbm ──
  float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.55;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 5; i++) {
      v += amp * noise(p);
      p = rot * p * 2.02;
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uRes.xy;
    vec2 p  = uv;
    p.x *= uRes.x / uRes.y;

    float t = uTime * 0.045;

    // subtle mouse parallax
    p += uMouse * 0.06;

    // domain-warped fbm → slow drifting aurora ribbons
    vec2 q = vec2(
      fbm(p * 1.4 + vec2(t, -t * 0.6)),
      fbm(p * 1.4 + vec2(-t * 0.4, t * 0.8) + 5.2)
    );
    float f = fbm(p * 1.7 + q * 1.6 + vec2(t * 0.5, -t * 0.3));

    // brand palette
    vec3 base    = vec3(0.012, 0.051, 0.094);  // #030d18 near-black navy
    vec3 midBlue = vec3(0.031, 0.110, 0.180);  // deep midnight blue
    vec3 teal    = vec3(0.314, 0.910, 0.957);  // #50E8F4 brand teal

    vec3 col = base;

    // broad blue depth
    col = mix(col, midBlue, smoothstep(0.25, 0.85, f) * 0.85);

    // teal aurora highlights — sparse, soft
    float ridge = smoothstep(0.55, 0.95, f);
    col = mix(col, teal, ridge * ridge * 0.22);

    // faint teal glow rising from bottom-right (behind the figure)
    float glow = (1.0 - uv.y) * 0.4 + uv.x * 0.25;
    col += teal * glow * 0.035;

    // vignette to keep edges dark and text readable
    float vig = smoothstep(1.25, 0.35, length(uv - vec2(0.5, 0.45)));
    col *= mix(0.72, 1.0, vig);

    // grain dither — kills gradient banding
    col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.012;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const RENDER_SCALE = 0.75;
const MAX_DPR = 1.5;

export default function WebGLBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let destroyed = false;
    let cleanup: (() => void) | null = null;

    const init = async () => {
      const THREE = await import("three");
      if (destroyed || !mount) return;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
        });
      } catch {
        // No WebGL available — the CSS background color stays, nothing breaks
        return;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const uniforms = {
        uTime:  { value: 0 },
        uRes:   { value: new THREE.Vector2(1, 1) },
        uMouse: { value: new THREE.Vector2(0, 0) },
      };

      const material = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms,
        depthTest: false,
        depthWrite: false,
      });
      const geometry = new THREE.PlaneGeometry(2, 2);
      scene.add(new THREE.Mesh(geometry, material));

      const canvas = renderer.domElement;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      mount.appendChild(canvas);

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        const w = Math.max(1, Math.round(mount.clientWidth * dpr * RENDER_SCALE));
        const h = Math.max(1, Math.round(mount.clientHeight * dpr * RENDER_SCALE));
        renderer.setSize(w, h, false);
        uniforms.uRes.value.set(w, h);
      };
      resize();

      // mouse parallax, lerped so it never jitters
      const target = { x: 0, y: 0 };
      const onMouse = (e: MouseEvent) => {
        target.x = (e.clientX / window.innerWidth - 0.5) * 2;
        target.y = (e.clientY / window.innerHeight - 0.5) * 2;
      };

      let raf = 0;
      let running = false;
      const start = performance.now();

      const renderFrame = () => {
        uniforms.uTime.value = (performance.now() - start) / 1000;
        const m = uniforms.uMouse.value;
        m.x += (target.x - m.x) * 0.03;
        m.y += (target.y - m.y) * 0.03;
        renderer.render(scene, camera);
      };

      const loop = () => {
        renderFrame();
        raf = requestAnimationFrame(loop);
      };

      const play = () => {
        if (running || reducedMotion) return;
        running = true;
        raf = requestAnimationFrame(loop);
      };
      const pause = () => {
        running = false;
        cancelAnimationFrame(raf);
      };

      const onVisibility = () => {
        if (document.hidden) pause();
        else play();
      };

      const onContextLost = (e: Event) => {
        e.preventDefault();
        pause();
      };
      const onContextRestored = () => play();

      window.addEventListener("resize", resize);
      window.addEventListener("mousemove", onMouse, { passive: true });
      document.addEventListener("visibilitychange", onVisibility);
      canvas.addEventListener("webglcontextlost", onContextLost);
      canvas.addEventListener("webglcontextrestored", onContextRestored);

      // static single frame for reduced motion, otherwise animate
      renderFrame();
      play();

      // fade in once the first frame exists
      mount.style.opacity = "1";

      cleanup = () => {
        pause();
        window.removeEventListener("resize", resize);
        window.removeEventListener("mousemove", onMouse);
        document.removeEventListener("visibilitychange", onVisibility);
        canvas.removeEventListener("webglcontextlost", onContextLost);
        canvas.removeEventListener("webglcontextrestored", onContextRestored);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        if (canvas.parentNode === mount) mount.removeChild(canvas);
      };
    };

    init();

    return () => {
      destroyed = true;
      cleanup?.();
      cleanup = null;
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity: 0, transition: "opacity 1.2s ease", background: "#030d18" }}
      aria-hidden
    />
  );
}
