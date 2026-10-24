import { useSyncExternalStore } from "react";
import { subscribe, getSnapshot, applyUpdate, dismissUpdate } from "../../pwa/pwa";

// Position comes from the .pwa-update-toast class (see src/pwa/init.jsx) so it clears the mobile bottom nav.
export default function UpdatePrompt() {
  const pwa = useSyncExternalStore(subscribe, getSnapshot);
  if (!pwa.updateAvailable) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pwa-update-toast"
      style={{
        background: "#12172a", color: "#fff", borderRadius: 14, padding: "12px 14px",
        display: "flex", alignItems: "center", gap: 12, boxShadow: "0 12px 34px rgba(0,0,0,0.3)", fontFamily: "inherit"
      }}
    >
      <div style={{ flex: 1, fontSize: 14, lineHeight: 1.35 }}>
        <b>New version available</b>
        <div style={{ fontSize: 12, opacity: 0.85 }}>Refresh to get the latest update.</div>
      </div>
      <button
        type="button"
        onClick={dismissUpdate}
        style={{ border: 0, background: "transparent", color: "#c3c7d6", fontSize: 13, cursor: "pointer", padding: "8px 6px" }}
      >
        Later
      </button>
      <button
        type="button"
        onClick={applyUpdate}
        style={{ border: 0, borderRadius: 8, background: "#e8192c", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "8px 14px" }}
      >
        Refresh
      </button>
    </div>
  );
}