"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type MatterNS from "matter-js";
import { useSiteContent } from "@/context/SiteContext";
import { useVoice } from "@/context/VoiceContext";
import { useReduceMotion } from "@/lib/useReduceMotion";
import EditableText from "@/components/ui/EditableText";
import MarginNote from "@/components/ui/MarginNote";
import Reveal from "@/components/ui/Reveal";
import RevealText from "@/components/ui/RevealText";
import ToolIcon from "@/components/ui/ToolIcon";

type Matter = typeof MatterNS;

interface Sim {
  M: Matter;
  engine: MatterNS.Engine;
  bodies: MatterNS.Body[];
  homes: { x: number; y: number }[];
  raf: number;
  last: number;
  grab: MatterNS.Constraint | null;
}

const STEP = 1000 / 60;

/**
 * The tools, on Flocon's desk. They start as a tidy set of labelled chips.
 * A moment after the section arrives she knocks them off: gravity switches
 * on (matter.js, loaded only then) and they tumble into a pile you can drag
 * around and throw. One button tidies the desk or knocks it over again.
 *
 * The chips never leave the document flow: physics only writes a transform
 * on each one, measured from where the layout put it. So with no script, in
 * the editor, or under reduced motion, it is simply a wrapped list. The
 * grouped reference underneath says what each tool is used for.
 */
export default function Skills() {
  const { content, isEditing } = useSiteContent();
  const groups = content.skills.groups;
  const tools = groups.flatMap((g) => g.items.map((it) => it.name));
  const { t } = useVoice();
  const reduce = useReduceMotion();

  const box = useRef<HTMLDivElement>(null);
  const chips = useRef<(HTMLLIElement | null)[]>([]);
  const sim = useRef<Sim | null>(null);
  const visible = useRef(false);
  const autoDone = useRef(false);
  const [loose, setLoose] = useState(false);

  const frame = useCallback((now: number) => {
    const s = sim.current;
    if (!s) return;
    // fixed steps, so the pile behaves the same on a 60Hz and a 120Hz screen
    let dt = Math.min(now - s.last, 50);
    s.last = now;
    while (dt > 0) {
      s.M.Engine.update(s.engine, Math.min(STEP, dt));
      dt -= STEP;
    }
    s.bodies.forEach((b, i) => {
      const el = chips.current[i];
      if (el) {
        el.style.transform = `translate(${b.position.x - s.homes[i].x}px, ${b.position.y - s.homes[i].y}px) rotate(${b.angle}rad)`;
      }
    });
    s.raf = visible.current ? requestAnimationFrame(frame) : 0;
  }, []);

  const tidy = useCallback((animate = true) => {
    const s = sim.current;
    if (s) {
      cancelAnimationFrame(s.raf);
      s.M.Composite.clear(s.engine.world, false);
      s.M.Engine.clear(s.engine);
      sim.current = null;
    }
    chips.current.forEach((el) => {
      if (!el) return;
      el.style.transition = animate ? "transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)" : "";
      el.style.transform = "";
    });
    setLoose(false);
  }, []);

  const knock = useCallback(async () => {
    if (sim.current || !box.current) return;
    const mod = await import("matter-js");
    const M = ((mod as unknown as { default?: Matter }).default ?? mod) as Matter;
    const root = box.current;
    if (!root || sim.current) return;

    const frameRect = root.getBoundingClientRect();
    const W = root.clientWidth;
    const H = root.clientHeight;
    const engine = M.Engine.create();
    engine.gravity.y = 1.1;

    const wall = { isStatic: true, friction: 0.6 };
    const T = 200; // wall thickness: thick enough that a thrown chip cannot tunnel
    const walls = [
      M.Bodies.rectangle(W / 2, H + T / 2, W + 2 * T, T, wall),
      M.Bodies.rectangle(-T / 2, H / 2 - 1000, T, H + 2000, wall),
      M.Bodies.rectangle(W + T / 2, H / 2 - 1000, T, H + 2000, wall),
      M.Bodies.rectangle(W / 2, -1200, W + 2 * T, T, wall),
    ];

    const homes: { x: number; y: number }[] = [];
    const bodies: MatterNS.Body[] = [];
    chips.current.forEach((el) => {
      if (!el) return;
      el.style.transition = "";
      el.style.transform = "";
      const r = el.getBoundingClientRect();
      const x = r.left - frameRect.left + r.width / 2;
      const y = r.top - frameRect.top + r.height / 2;
      homes.push({ x, y });
      const body = M.Bodies.rectangle(x, y, r.width, r.height, {
        chamfer: { radius: r.height / 2 - 1 },
        restitution: 0.32,
        friction: 0.35,
        frictionAir: 0.012,
        density: 0.002,
      });
      // the knock: a shove sideways and a little spin
      M.Body.setVelocity(body, { x: (Math.random() - 0.35) * 9, y: -Math.random() * 5 });
      M.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.18);
      bodies.push(body);
    });

    M.Composite.add(engine.world, [...walls, ...bodies]);
    sim.current = { M, engine, bodies, homes, raf: 0, last: performance.now(), grab: null };
    setLoose(true);
    sim.current.raf = requestAnimationFrame(frame);
  }, [frame]);

  // Run only while on screen, and knock the desk over once, the first time
  // the visitor has properly arrived.
  useEffect(() => {
    const root = box.current;
    if (!root) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.isIntersecting;
        const s = sim.current;
        if (entry.isIntersecting && s && !s.raf) {
          s.last = performance.now();
          s.raf = requestAnimationFrame(frame);
        }
        if (entry.intersectionRatio > 0.55 && !autoDone.current && !reduce && !isEditing) {
          autoDone.current = true;
          timer = setTimeout(knock, 650);
        }
      },
      { threshold: [0, 0.55] }
    );
    io.observe(root);
    return () => {
      io.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [frame, knock, reduce, isEditing]);

  // A new width means new homes for every chip: put the desk back in order.
  useEffect(() => {
    let w = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === w) return;
      w = window.innerWidth;
      tidy(false);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      tidy(false);
    };
  }, [tidy]);

  // Dragging: a soft spring between the pointer and the point that was grabbed.
  const point = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (i: number) => (e: React.PointerEvent<HTMLLIElement>) => {
    const s = sim.current;
    if (!s) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = point(e);
    const body = s.bodies[i];
    s.grab = s.M.Constraint.create({
      pointA: p,
      bodyB: body,
      pointB: { x: p.x - body.position.x, y: p.y - body.position.y },
      length: 0,
      stiffness: 0.14,
      damping: 0.12,
    });
    s.M.Composite.add(s.engine.world, s.grab);
  };
  const onMove = (e: React.PointerEvent) => {
    const s = sim.current;
    if (s?.grab) s.grab.pointA = point(e);
  };
  const onUp = () => {
    const s = sim.current;
    if (s?.grab) {
      s.M.Composite.remove(s.engine.world, s.grab);
      s.grab = null;
    }
  };

  const playful = !reduce && !isEditing;

  return (
    <section id="skills" className="px-4 py-24 sm:px-8 lg:px-12 lg:py-36">
      <div className="mx-auto max-w-[1760px]">
        <h2 className="mega text-m1 [text-wrap:balance]">
          <RevealText path="skills.heading" className="block" />
        </h2>
        <Reveal>
          <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-muted">
            <EditableText path="skills.subheading" />
          </p>
        </Reveal>

        <div className="mt-12 flex flex-wrap items-end justify-between gap-6 lg:mt-16">
          <MarginNote section="skills" face="neutral" />
          {playful && (
            <div className="flex items-center gap-4">
              <p aria-hidden className="hidden text-sm text-muted sm:block">
                {loose ? t("Drag them. Throw them.", "Go on. Throw one.") : ""}
              </p>
            <button
              type="button"
              onClick={() => (loose ? tidy() : knock())}
              className="rounded-full border border-line2 px-5 py-3 text-sm font-medium transition-colors hover:bg-content/5 active:scale-[0.98]"
            >
              {loose ? t("Tidy the desk", "Fine, tidy up") : t("Let Flocon at them", "Knock them off")}
            </button>
            </div>
          )}
        </div>

        {/* the desk */}
        <div
          ref={box}
          className={`relative mt-6 overflow-hidden border border-line bg-surface ${
            playful ? "min-h-[30rem] sm:min-h-[26rem] lg:min-h-[28rem]" : ""
          }`}
        >
          <ul className="flex flex-wrap content-start gap-2.5 p-4 sm:p-6" aria-label="Tools">
            {tools.map((name, i) => (
              <li
                key={name}
                ref={(el) => {
                  chips.current[i] = el;
                }}
                data-grab={loose ? "" : undefined}
                onPointerDown={onDown(i)}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                className={`flex select-none items-center gap-2.5 rounded-full border border-line2 bg-ink px-4 py-2.5 text-sm font-medium will-change-transform sm:px-5 sm:py-3 sm:text-base ${
                  loose ? "touch-none" : ""
                }`}
              >
                <ToolIcon name={name} size={20} />
                {name}
              </li>
            ))}
          </ul>
        </div>

        {/* what each one is for */}
        <div className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4">
          {groups.map((g, gi) => (
            <Reveal key={g.title} delay={gi * 0.06} className="border-t border-line2 pt-5">
              <h3 className="font-display text-2xl font-semibold">
                <EditableText path={`skills.groups.${gi}.title`} />
              </h3>
              <p className="mt-1 text-sm text-muted">
                <EditableText path={`skills.groups.${gi}.note`} />
              </p>
              <ul className="mt-6 space-y-4">
                {g.items.map((it, ii) => (
                  <li key={it.name}>
                    <span className="block font-medium">
                      <EditableText path={`skills.groups.${gi}.items.${ii}.name`} />
                    </span>
                    <span className="block text-sm text-muted">
                      <EditableText path={`skills.groups.${gi}.items.${ii}.detail`} />
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
