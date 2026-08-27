// Making a new notification noticeable when the CRM is not the tab you are
// looking at.
//
// Two channels, because one is not enough on its own:
//
//   **Sound** carries when the CRM is in a background tab, behind another
//   window, or on a second monitor you are not watching. It is the only
//   channel that reaches somebody working in a different browser entirely.
//
//   **A desktop notification** carries when the machine is muted, and says
//   *what* happened rather than only that something did.
//
// The sound is synthesised with the Web Audio API rather than shipped as an
// mp3. That is a deliberate trade: no asset to load, no request that can fail
// or 404, nothing to cache-bust, and it works offline. Two soft notes, short
// and quiet — this fires while people are doing other work, and an alarm
// would get the tab muted permanently, which would defeat the whole feature.

const STORAGE_KEY = "thco-notification-sound";

// Browsers refuse to start audio until the user has interacted with the page.
// A muted first attempt is normal rather than an error, so it is not logged
// as one; the next one, after any click, works.
let audioContext = null;

function getContext() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) {
    try {
      audioContext = new Ctor();
    } catch {
      return null;
    }
  }
  return audioContext;
}

/** Whether the user wants sound. On by default; the choice persists. */
export function soundEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    /* a browser with storage blocked simply keeps the default */
  }
}

/**
 * Two short notes, a rising minor third. Quiet on purpose.
 * Silently does nothing if audio is unavailable or the user turned it off.
 */
export function playNotificationSound({ force = false } = {}) {
  if (!force && !soundEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;

  // A context created before the first user gesture starts suspended. Resuming
  // is a no-op once it is already running, so this costs nothing.
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  // G5 then B5 — pleasant, distinct from OS chimes, and short enough that two
  // arriving together do not overlap into noise.
  [
    { freq: 784.0, at: 0 },
    { freq: 987.8, at: 0.12 },
  ].forEach(({ freq, at }) => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + at);

      // An envelope rather than a hard start/stop: a square-edged tone clicks
      // audibly at both ends.
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.14, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.32);
    } catch {
      /* one note failing is not worth surfacing */
    }
  });
}

/** Has the user been asked about desktop notifications yet? */
export function desktopPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission; // "granted" | "denied" | "default"
}

/**
 * Ask for desktop notification permission.
 *
 * Must be called from a user gesture — browsers ignore (and Safari rejects) a
 * request made on page load, and asking unprompted is how people click "block"
 * and lose the feature permanently.
 */
export async function requestDesktopPermission() {
  if (!("Notification" in window)) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * Show one desktop notification. Clicking it focuses the tab and follows the
 * notification's link.
 */
export function showDesktopNotification({ title, body, link, onNavigate }) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const note = new Notification(title || "Crowther OS", {
      body: body || "",
      icon: "/crowther-icon.png",
      // Same tag for all of ours, so a burst replaces rather than stacks into
      // a wall of identical popups.
      tag: "thco-crm-notification",
      renotify: true,
    });
    note.onclick = () => {
      window.focus();
      if (link) onNavigate?.(link);
      note.close();
    };
  } catch {
    /* some browsers throw on construction in odd contexts */
  }
}

/**
 * Alert the user to newly-arrived notifications: sound, and a desktop popup
 * when the tab is not the one in front.
 *
 * Only fires when the page is hidden or unfocused for the desktop popup —
 * if they are already looking at the CRM, the bell badge is enough and a
 * popup would be shouting at somebody who can already see it.
 */
export function alertNewNotifications({ count, latest, onNavigate }) {
  if (!count || count < 1) return;
  playNotificationSound();

  const hidden = typeof document !== "undefined" && document.visibilityState !== "visible";
  if (!hidden) return;

  const title = count === 1
    ? (latest?.title || "New notification")
    : `${count} new notifications`;
  showDesktopNotification({
    title,
    body: count === 1 ? (latest?.body || "") : "Open Crowther OS to read them.",
    link: count === 1 ? latest?.link : "/flow",
    onNavigate,
  });
}
