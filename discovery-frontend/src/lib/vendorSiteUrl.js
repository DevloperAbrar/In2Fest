import { BASE_DOMAIN } from "./constants";

const APP_URL = import.meta.env.VITE_APP_URL || "http://localhost:5173";

// URL of a vendor's branded website (the per-vendor subdomain site).
// Dev  : http://<slug>.localhost:<vendor-app-port>   e.g. http://waghela-events.localhost:5173
// Prod : https://<slug>.<BASE_DOMAIN>
export function getVendorSiteUrl(slug) {
  if (!slug) return null;

  if (import.meta.env.DEV) {
    let port = "5173";
    try {
      port = new URL(APP_URL).port || port;
    } catch {
      /* invalid VITE_APP_URL, keep default port */
    }
    return `http://${slug}.localhost:${port}`;
  }

  return `https://${slug}.${BASE_DOMAIN}`;
}