// Framework-free PWA core: install prompt, host guard, service worker, update detection.
// Everything here is a no-op on vendor subdomains (name.in2fest.com).
import { BASE_DOMAIN } from "../lib/constants";

// Comma separated list is allowed: VITE_APP_HOST=app.in2fest.com,in2fest.com
const APP_HOSTS = [
  ...String(import.meta.env.VITE_APP_HOST || "app.in2fest.com").split(","),
  `app.${BASE_DOMAIN}`
]
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

const SNOOZE_KEY = "in2fest_pwa_snooze_until";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const UPDATE_CHECK_MS = 5 * 60 * 1000;

let started = false;
let deferredPrompt = null;
let updateDismissed = false;
const listeners = new Set();

let snapshot = { canInstall: false, installed: false, ios: false, updateAvailable: false };

function setState(patch) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((l) => l());
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  return snapshot;
}

export function isAppHost() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || APP_HOSTS.includes(h);
}

function detectStandalone() {
  try {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  } catch {
    return false;
  }
}

function detectIos() {
  const ua = navigator.userAgent || "";
  const iDevice = /iphone|ipad|ipod/i.test(ua);
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iDevice || iPadOs;
}

/* ---------------- install banner snooze ---------------- */
export function isInstallSnoozed() {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY) || 0) > Date.now();
  } catch {
    return false;
  }
}

export function snoozeInstallPrompt() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
  } catch {
    /* storage blocked - ignore */
  }
  setState({}); // notify subscribers
}

/* ---------------- head tags (only on the app host) ---------------- */
function ensureTag(selector, create) {
  if (document.head.querySelector(selector)) return;
  document.head.appendChild(create());
}

function makeLink(rel, href) {
  const el = document.createElement("link");
  el.rel = rel;
  el.href = href;
  return el;
}

function makeMeta(name, content) {
  const el = document.createElement("meta");
  el.name = name;
  el.content = content;
  return el;
}

function injectHeadTags() {
  ensureTag('link[rel="manifest"]', () => makeLink("manifest", "/manifest.webmanifest"));
  ensureTag('meta[name="theme-color"]', () => makeMeta("theme-color", "#12172a"));

  // index.html points apple-touch-icon at the wide logo. On the app host use the square icon.
  const touch = document.head.querySelector('link[rel="apple-touch-icon"]');
  if (touch) touch.setAttribute("href", "/icons/apple-touch-icon.png");
  else document.head.appendChild(makeLink("apple-touch-icon", "/icons/apple-touch-icon.png"));

  ensureTag('meta[name="mobile-web-app-capable"]', () => makeMeta("mobile-web-app-capable", "yes"));
  ensureTag('meta[name="apple-mobile-web-app-capable"]', () => makeMeta("apple-mobile-web-app-capable", "yes"));
  ensureTag('meta[name="apple-mobile-web-app-title"]', () => makeMeta("apple-mobile-web-app-title", "In2Fest"));
  ensureTag('meta[name="apple-mobile-web-app-status-bar-style"]', () => makeMeta("apple-mobile-web-app-status-bar-style", "default"));
}

/* ---------------- install ---------------- */
export async function promptInstall() {
  if (!deferredPrompt) return "unavailable";
  const evt = deferredPrompt;
  deferredPrompt = null;
  setState({ canInstall: false });
  try {
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    return outcome; // "accepted" | "dismissed"
  } catch {
    return "unavailable";
  }
}

/* ---------------- service worker ---------------- */
function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  const go = () =>
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((err) => console.warn("[pwa] service worker registration failed:", err));
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go, { once: true });
}

/* ---------------- update detection ----------------
 * Vite gives the entry script a new hash on every build. We compare the entry
 * script of the running page with the one in the freshly deployed index.html.
 */
function entrySrcOf(root) {
  const el = root.querySelector('script[type="module"][src*="/assets/"]');
  return el ? el.getAttribute("src") : null;
}

async function checkForUpdate() {
  if (snapshot.updateAvailable || updateDismissed || !navigator.onLine) return;
  const current = entrySrcOf(document);
  if (!current) return;
  try {
    const res = await fetch(`/index.html?pwa=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return;
    const html = await res.text();
    const next = entrySrcOf(new DOMParser().parseFromString(html, "text/html"));
    if (next && next !== current) setState({ updateAvailable: true });
  } catch {
    /* offline or network hiccup - try again later */
  }
}

function startUpdateWatcher() {
  if (!import.meta.env.PROD) return;
  setInterval(checkForUpdate, UPDATE_CHECK_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForUpdate();
  });
  window.addEventListener("online", checkForUpdate);
  // an old tab asks for a JS chunk that no longer exists after a deploy
  window.addEventListener("vite:preloadError", () => setState({ updateAvailable: true }));
}

export function applyUpdate() {
  window.location.reload();
}

export function dismissUpdate() {
  updateDismissed = true;
  setState({ updateAvailable: false });
}

/* ---------------- boot ---------------- */
export function initPwa() {
  if (started || typeof window === "undefined" || !isAppHost()) return false;
  started = true;

  setState({ installed: detectStandalone(), ios: detectIos() });
  injectHeadTags();

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    setState({ canInstall: true });
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    setState({ installed: true, canInstall: false });
  });

  try {
    window.matchMedia("(display-mode: standalone)").addEventListener("change", (e) => {
      setState({ installed: e.matches });
    });
  } catch {
    /* old browsers */
  }

  // Ask the browser not to wipe this app's saved login (localStorage) when the phone is low on space.
  try {
    if (navigator.storage && typeof navigator.storage.persist === "function") navigator.storage.persist();
  } catch {
    /* not supported - ignore */
  }

  registerServiceWorker();
  startUpdateWatcher();
  return true;
}