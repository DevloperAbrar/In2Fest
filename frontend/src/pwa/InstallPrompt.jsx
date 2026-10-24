import { useSyncExternalStore } from "react";
import { subscribe, getSnapshot, isAppHost, isInstallSnoozed, snoozeInstallPrompt } from "./pwa";
import InstallAppButton from "../components/common/InstallAppButton";

// Floating "Install app" card. Position comes from the .pwa-install-card class (see init.jsx).
export default function InstallPrompt() {
  const pwa = useSyncExternalStore(subscribe, getSnapshot);

  if (!isAppHost() || pwa.installed) return null;
  if (!pwa.canInstall && !pwa.ios) return null;
  if (isInstallSnoozed()) return null;

  return (
    <div
      className="pwa-install-card"
      style={{
        background: "#fff", color: "#12172a", border: "1px solid #c3c7d6", borderRadius: 14, padding: 14,
        boxShadow: "0 12px 34px rgba(18,23,42,0.18)", fontFamily: "inherit"
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Install In2Fest app</div>
      <div style={{ fontSize: 12.5, color: "#6d7591", lineHeight: 1.4, marginBottom: 12 }}>
        Faster access from your home screen or desktop, full-screen, no browser bar.
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <InstallAppButton label="Install" onInstalled={snoozeInstallPrompt} />
        <button
          type="button"
          onClick={snoozeInstallPrompt}
          style={{ border: 0, background: "transparent", color: "#6d7591", fontSize: 13, cursor: "pointer", padding: "8px 6px" }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}