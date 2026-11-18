"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { motion } from "framer-motion";
import type { PadAction } from "./useGamepad";

/**
 * Typing with a controller: an on-screen keyboard that opens when a text
 * field is selected with the pad, the way a console does it. The layout and
 * look are this site's own.
 *
 *   d-pad / left stick   move between keys
 *   south                type the key
 *   west                 delete
 *   north                space
 *   L2                   capitals
 *   L1 / R1              move the cursor
 *   R2 or Menu           done
 *   east                 close
 *
 * Mouse and touch work on it too. While it is open the app hands it every
 * pad action through `api.current.handle`.
 */

type Key =
  | { kind: "char"; label: string }
  | { kind: "shift" | "accents" | "space" | "delete" | "done"; label: string; span: number };

const ROWS_LOWER = ["1234567890", "qwertyuiop", "asdfghjkl@", "zxcvbnm,.'"];
const ROWS_ACCENT = ["1234567890", "éèêëàâäçôö", "ûùüîïñœæß'", "ÉÈÀÇ-_!?:/"];

function rowsFor(layer: "abc" | "accents", caps: boolean): Key[][] {
  const src = layer === "abc" ? ROWS_LOWER : ROWS_ACCENT;
  const chars = src.map((row) =>
    [...row].map((ch): Key => ({ kind: "char", label: caps ? ch.toLocaleUpperCase() : ch })),
  );
  const bottom: Key[] = [
    { kind: "shift", label: caps ? "ABC" : "abc", span: 1 },
    { kind: "accents", label: layer === "abc" ? "àé" : "abc", span: 1 },
    { kind: "space", label: "Space", span: 4 },
    { kind: "delete", label: "Delete", span: 2 },
    { kind: "done", label: "Done", span: 2 },
  ];
  return [...chars, bottom];
}

/** Which key covers column `col` (in units of one ordinary key) on a row. */
function keyAt(row: Key[], col: number) {
  let x = 0;
  for (let i = 0; i < row.length; i++) {
    const span = "span" in row[i] ? (row[i] as { span: number }).span : 1;
    if (col < x + span) return { index: i, start: x, span };
    x += span;
  }
  return { index: row.length - 1, start: x - 1, span: 1 };
}

export interface PadKeyboardApi {
  handle: (action: PadAction) => void;
}

export default function PadKeyboard({
  api,
  label,
  value,
  maxLength,
  onChange,
  onDone,
  onClose,
  onMove,
  onType,
  onEdge,
}: {
  api: MutableRefObject<PadKeyboardApi | null>;
  label: string;
  value: string;
  maxLength: number;
  onChange: (v: string) => void;
  onDone: () => void;
  onClose: () => void;
  onMove?: () => void;
  onType?: () => void;
  onEdge?: () => void;
}) {
  const [layer, setLayer] = useState<"abc" | "accents">("abc");
  const [caps, setCaps] = useState(false);
  const [pos, setPos] = useState({ row: 1, col: 0 });
  const [caret, setCaret] = useState(value.length);
  const rows = rowsFor(layer, caps);

  // Everything the handlers need, current at all times.
  const live = useRef({ value, caret, pos, rows, caps, layer });
  live.current = { value, caret: Math.min(caret, value.length), pos, rows, caps, layer };

  const insert = (text: string) => {
    const { value: v, caret: c } = live.current;
    if (v.length + text.length > maxLength) return onEdge?.();
    onChange(v.slice(0, c) + text + v.slice(c));
    setCaret(c + text.length);
    onType?.();
  };

  const erase = () => {
    const { value: v, caret: c } = live.current;
    if (c === 0) return onEdge?.();
    onChange(v.slice(0, c - 1) + v.slice(c));
    setCaret(c - 1);
    onType?.();
  };

  const press = (k: Key) => {
    switch (k.kind) {
      case "char":
        insert(k.label);
        // Capitals for one letter, then back to small, as on a phone.
        if (live.current.caps && live.current.layer === "abc") setCaps(false);
        return;
      case "space":
        return insert(" ");
      case "delete":
        return erase();
      case "shift":
        onMove?.();
        return setCaps((c) => !c);
      case "accents":
        onMove?.();
        return setLayer((l) => (l === "abc" ? "accents" : "abc"));
      case "done":
        return onDone();
    }
  };

  const move = (dir: "left" | "right" | "up" | "down") => {
    const { pos: p, rows: r } = live.current;
    const row = r[p.row];
    const here = keyAt(row, p.col);
    let next = p;
    if (dir === "left" || dir === "right") {
      const i = (here.index + (dir === "left" ? -1 : 1) + row.length) % row.length;
      let x = 0;
      for (let k = 0; k < i; k++) x += "span" in row[k] ? (row[k] as { span: number }).span : 1;
      next = { row: p.row, col: x };
    } else {
      const nr = p.row + (dir === "up" ? -1 : 1);
      if (nr < 0 || nr >= r.length) return onEdge?.();
      next = { row: nr, col: here.start + Math.floor((here.span - 1) / 2) };
    }
    setPos(next);
    onMove?.();
  };

  api.current = {
    handle(action) {
      switch (action) {
        case "left":
        case "right":
        case "up":
        case "down":
          return move(action);
        case "select": {
          const { pos: p, rows: r } = live.current;
          return press(r[p.row][keyAt(r[p.row], p.col).index]);
        }
        case "west":
          return erase();
        case "north":
          return insert(" ");
        case "l2":
          onMove?.();
          return setCaps((c) => !c);
        case "l1":
        case "r1": {
          const { value: v, caret: c } = live.current;
          const n = Math.max(0, Math.min(v.length, c + (action === "l1" ? -1 : 1)));
          if (n === c) return onEdge?.();
          setCaret(n);
          return onMove?.();
        }
        case "r2":
        case "menu":
          return onDone();
        case "back":
          return onClose();
      }
    },
  };

  // Text typed on a real keyboard meanwhile keeps the cursor at the end.
  useEffect(() => {
    setCaret((c) => Math.min(c, value.length));
  }, [value]);

  const selected = keyAt(rows[pos.row], pos.col).index;
  const shown = live.current.caret;

  return (
    <motion.div
      className="c-panel fixed inset-x-0 bottom-0 z-[70] mx-auto w-[min(46rem,100%)] rounded-t-[1.6rem] border border-white/15 px-4 pb-5 pt-4 shadow-[0_-20px_60px_rgb(0_0_0/0.6)] sm:bottom-6 sm:rounded-[1.6rem]"
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 320 }}
      role="group"
      aria-label={`On-screen keyboard for ${label}`}
    >
      <div className="mb-3 flex items-center gap-3 rounded-xl bg-black/35 px-4 py-3">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-content/55">{label}</span>
        <span className="min-w-0 flex-1 truncate text-lg" aria-live="polite">
          {value.slice(0, shown)}
          <span className="c-caret" aria-hidden="true" />
          {value.slice(shown)}
        </span>
        <span className="font-mono text-xs text-content/45">
          {value.length}/{maxLength}
        </span>
      </div>
      <div className="grid gap-1.5">
        {rows.map((row, r) => (
          <div key={r} className="grid grid-cols-10 gap-1.5">
            {row.map((k, i) => {
              const on = r === pos.row && i === selected;
              const special = k.kind !== "char";
              return (
                <button
                  key={`${r}-${i}-${k.label}`}
                  type="button"
                  tabIndex={-1}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    let x = 0;
                    for (let j = 0; j < i; j++) x += "span" in row[j] ? (row[j] as { span: number }).span : 1;
                    setPos({ row: r, col: x });
                    press(k);
                  }}
                  aria-pressed={k.kind === "shift" ? caps : undefined}
                  className={`flex h-11 items-center justify-center rounded-xl text-[15px] transition-colors sm:h-12 ${
                    on
                      ? "bg-accent font-semibold text-onAccent shadow-[0_0_0_3px_rgb(var(--accent-rgb)/0.35)]"
                      : special
                        ? "bg-white/[0.1] text-sm text-content/85 hover:bg-white/20"
                        : "bg-white/[0.06] hover:bg-white/15"
                  }`}
                  style={"span" in k ? { gridColumn: `span ${k.span}` } : undefined}
                >
                  {k.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-content/55">
        <span>South: type</span>
        <span>West: delete</span>
        <span>North: space</span>
        <span>L2: capitals</span>
        <span>L1 / R1: cursor</span>
        <span>R2: done</span>
        <span>East: close</span>
      </p>
    </motion.div>
  );
}
