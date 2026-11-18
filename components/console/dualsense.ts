/**
 * Vibration and the light bar for a PlayStation 5 controller, sent straight
 * to the controller over WebHID.
 *
 * Why: Chrome reads a DualSense's buttons through the Gamepad API but gives
 * pages no `vibrationActuator` for it (tested on Windows, USB and Bluetooth).
 * Over USB the controller takes its own output report, so the site can make
 * it rumble and colour its light bar directly, with the buttons still read by
 * the browser as before.
 *
 * Only USB is used. Over Bluetooth the controller ignored every command until
 * it was switched into its full mode, and in that mode Chrome can no longer
 * read the buttons, so Bluetooth is left alone.
 *
 * Chrome asks once ("Turn on vibration" in the console's quick menu, which
 * has to be a click or a key, not a pad button); after that the controller is
 * reopened on every visit without asking.
 */

const SONY = 0x054c;
const DUALSENSE_PRODUCTS = new Set([0x0ce6, 0x0df2]); // DualSense, DualSense Edge
const USB_REPORT = 0x02;

interface HidReportInfo {
  reportId: number;
  items: { reportSize: number; reportCount: number }[];
}
interface HidDeviceLike extends EventTarget {
  opened: boolean;
  vendorId: number;
  productId: number;
  productName: string;
  collections: { outputReports?: HidReportInfo[] }[];
  open(): Promise<void>;
  close(): Promise<void>;
  sendReport(id: number, data: BufferSource): Promise<void>;
}
interface HidLike extends EventTarget {
  getDevices(): Promise<HidDeviceLike[]>;
  requestDevice(o: { filters: { vendorId: number; productId?: number }[] }): Promise<HidDeviceLike[]>;
}

const hid = (): HidLike | null =>
  typeof navigator !== "undefined" && "hid" in navigator ? ((navigator as unknown as { hid: HidLike }).hid ?? null) : null;

let device: HidDeviceLike | null = null;
let reportBytes = 47;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let light: [number, number, number] | null = null;
let watching = false;
let queue: Promise<void> = Promise.resolve();

/** The browser can talk to devices directly (Chrome and Edge on desktop). */
export function hidSupported() {
  return !!hid();
}

/** A DualSense is open and taking commands. */
export function dualSenseReady() {
  return !!device?.opened;
}

/** Its USB output report, and how long the controller says it is. */
function usbReportSize(d: HidDeviceLike): number | null {
  for (const c of d.collections) {
    for (const r of c.outputReports ?? []) {
      if (r.reportId === USB_REPORT) return r.items.reduce((s, it) => s + it.reportSize * it.reportCount, 0) / 8;
    }
  }
  return null; // no 0x02: it is on Bluetooth
}

const isDualSense = (d: HidDeviceLike) => d.vendorId === SONY && DUALSENSE_PRODUCTS.has(d.productId);

async function adopt(d: HidDeviceLike): Promise<boolean> {
  if (!isDualSense(d)) return false;
  const size = usbReportSize(d);
  if (!size) return false;
  try {
    if (!d.opened) await d.open();
  } catch {
    return false;
  }
  device = d;
  reportBytes = size;
  if (light) void send({ rgb: light });
  return true;
}

function watch() {
  const h = hid();
  if (!h || watching) return;
  watching = true;
  // Plugged in again later: pick it up without asking, the permission stands.
  h.addEventListener("connect", (e) => void adopt((e as unknown as { device: HidDeviceLike }).device));
  h.addEventListener("disconnect", (e) => {
    if ((e as unknown as { device: HidDeviceLike }).device === device) device = null;
  });
}

/** Reopen a DualSense this site was allowed to use before. Silent; no prompt. */
export async function restoreDualSense(): Promise<boolean> {
  const h = hid();
  if (!h) return false;
  watch();
  if (dualSenseReady()) return true;
  try {
    for (const d of await h.getDevices()) if (await adopt(d)) return true;
  } catch {
    /* not allowed here (an iframe, a policy): nothing to restore */
  }
  return false;
}

export type DualSenseResult = "ok" | "unsupported" | "cancelled" | "bluetooth" | "failed";

/**
 * Ask Chrome for the controller. Must run inside a click or key press: Chrome
 * refuses the prompt otherwise (a pad button does not count).
 */
export async function requestDualSense(): Promise<DualSenseResult> {
  const h = hid();
  if (!h) return "unsupported";
  watch();
  let picked: HidDeviceLike[];
  try {
    picked = await h.requestDevice({ filters: [{ vendorId: SONY, productId: 0x0ce6 }, { vendorId: SONY, productId: 0x0df2 }] });
  } catch {
    return "failed";
  }
  if (!picked.length) return "cancelled";
  for (const d of picked) {
    if (await adopt(d)) return "ok";
    if (isDualSense(d) && !usbReportSize(d)) return "bluetooth";
  }
  return "failed";
}

/** One output report: whichever of rumble and light bar is given. */
function send({ strong, weak, rgb }: { strong?: number; weak?: number; rgb?: [number, number, number] }) {
  const d = device;
  if (!d?.opened) return Promise.resolve();
  const data = new Uint8Array(reportBytes);
  if (strong !== undefined && weak !== undefined) {
    data[0] = 0x03; // rumble emulation, rumble rather than haptics
    data[2] = Math.round(Math.min(1, weak) * 255); // right motor: the light, quick one
    data[3] = Math.round(Math.min(1, strong) * 255); // left motor: the heavy one
    if (reportBytes > 38) data[38] = 0x04; // the same switch on newer firmware
  }
  if (rgb && reportBytes > 46) {
    data[1] = 0x04; // light bar colour
    data[44] = rgb[0];
    data[45] = rgb[1];
    data[46] = rgb[2];
  }
  // One write at a time; a failed write (unplugged) drops the device.
  queue = queue
    .then(() => d.sendReport(USB_REPORT, data))
    .catch(() => {
      if (device === d) device = null;
    });
  return queue;
}

/** A buzz of `ms`, then still. A new buzz replaces the one before. */
export function dualSenseRumble(strong: number, weak: number, ms: number): boolean {
  if (!dualSenseReady()) return false;
  if (stopTimer) clearTimeout(stopTimer);
  void send({ strong, weak });
  stopTimer = setTimeout(() => {
    stopTimer = null;
    void send({ strong: 0, weak: 0 });
  }, ms);
  return true;
}

/** The light bar, in the player's colour. Remembered for when it reconnects. */
export function dualSenseLight(rgb: [number, number, number]) {
  light = rgb;
  if (dualSenseReady()) void send({ rgb });
}
