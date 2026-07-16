"use client";

import { useEffect, useRef } from "react";

export default function WebGLBackground() {
  const mountRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const effectRef = useRef<any>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    let destroyed = false;

    const init = async () => {
      const THREE = await import("three");
      // @ts-expect-error vanta has no types
      const CLOUDS2 = (await import("vanta/dist/vanta.clouds2.min")).default;

      if (destroyed || !mountRef.current) return;

      effectRef.current = CLOUDS2({
        el: mountRef.current,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        scale: 1.0,
        scaleMobile: 1.0,
        texturePath: "/noise.png",
        backgroundColor: 0x030d18,  // near-black navy base
        skyColor:        0x0a1e32,  // dark midnight blue sky
        cloudColor:      0x1c4562,  // visible deep teal-blue clouds
        lightColor:      0x50e8f4,  // brand teal illumination
        speed: 0.6,
      });
    };

    init();

    return () => {
      destroyed = true;
      if (effectRef.current) {
        effectRef.current.destroy();
        effectRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
