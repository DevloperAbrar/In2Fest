// Google sign-in for website visitors (customers). Separate from the vendor login:
// it never sends or touches the vendor's token.
//
// Google only allows a few fixed origins, so the sign-in itself happens in a popup on the MAIN app
// origin (/visitor-login) and the session is passed back to the restaurant website with postMessage.
import axios from "axios";
import { API_BASE_URL, BASE_DOMAIN } from "./constants";

const TOKEN_KEY = "in2fest-visitor-token";
const USER_KEY = "in2fest-visitor-user";

const read = (k) => { try { return window.localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => {
  try { if (v === null || v === undefined) window.localStorage.removeItem(k); else window.localStorage.setItem(k, v); } catch { /* private mode */ }
};

export const getVisitorToken = () => read(TOKEN_KEY);
export const getVisitorUser = () => { try { return JSON.parse(read(USER_KEY) || "null"); } catch { return null; } };
export function setVisitorSession(token, user) {
  write(TOKEN_KEY, token);
  write(USER_KEY, user ? JSON.stringify(user) : null);
}
export const clearVisitorSession = () => setVisitorSession(null, null);

export const visitorApi = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

visitorApi.interceptors.request.use((config) => {
  const t = getVisitorToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// Access token expired: try the refresh cookie once, otherwise ask the visitor to sign in again.
visitorApi.interceptors.response.use((r) => r, async (error) => {
  const original = error.config;
  if (error.response?.status === 401 && original && !original._retry) {
    original._retry = true;
    try {
      const { data } = await axios.post(`${API_BASE_URL}/public-auth/refresh`, {}, { withCredentials: true });
      setVisitorSession(data.data.accessToken, getVisitorUser());
      return visitorApi(original);
    } catch {
      clearVisitorSession();
      window.dispatchEvent(new Event("in2fest-visitor-signed-out"));
    }
  }
  return Promise.reject(error);
});

// The one origin registered with Google. Set VITE_MAIN_APP_URL if your main app lives elsewhere.
export function getMainOrigin() {
  const fromEnv = import.meta.env.VITE_MAIN_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  const { protocol, hostname, port } = window.location;
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return `${protocol}//localhost${port ? `:${port}` : ""}`;
  return `${protocol}//${BASE_DOMAIN}`;
}

// Which website origins may receive the session from the login popup.
export function isAllowedSiteOrigin(origin) {
  try {
    const host = new URL(origin).hostname;
    if (host === "localhost" || host.endsWith(".localhost")) return true; // local development
    return host.endsWith(`.${BASE_DOMAIN}`);
  } catch {
    return false;
  }
}

// Used by the /visitor-login popup page.
export async function exchangeGoogleCredential(credential) {
  const { data } = await axios.post(`${API_BASE_URL}/public-auth/google`, { credential }, { withCredentials: true });
  return { accessToken: data.data.accessToken, user: data.data.user };
}

// Used by the restaurant website: opens the popup and resolves with the signed-in visitor.
export function signInWithGooglePopup() {
  return new Promise((resolve, reject) => {
    const main = getMainOrigin();
    const w = 480;
    const h = 620;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(
      `${main}/visitor-login?origin=${encodeURIComponent(window.location.origin)}`,
      "in2fest-visitor-login",
      `width=${w},height=${h},left=${left},top=${top}`
    );
    if (!popup) return reject(new Error("popup_blocked"));

    let finished = false;
    let timer = null;
    const cleanup = () => { window.removeEventListener("message", onMessage); clearInterval(timer); };
    const onMessage = (e) => {
      if (e.origin !== main || e.source !== popup) return;
      if (!e.data || e.data.type !== "in2fest-visitor-login") return;
      finished = true;
      cleanup();
      setVisitorSession(e.data.accessToken, e.data.user);
      resolve(e.data.user);
    };
    window.addEventListener("message", onMessage);
    timer = setInterval(() => {
      if (popup.closed && !finished) { cleanup(); reject(new Error("closed")); }
    }, 500);
    return undefined;
  });
}

export async function visitorSignOut() {
  try { await axios.post(`${API_BASE_URL}/public-auth/logout`, {}, { withCredentials: true }); } catch { /* ignore */ }
  clearVisitorSession();
}