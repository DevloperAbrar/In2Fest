import { useState, useSyncExternalStore } from "react";
import { subscribe, getSnapshot, isAppHost, promptInstall } from "../../pwa/pwa";

const NAVY = "#12172a";
const RED = "#e8192c";

function IosGuide({ onClose }) {
  const step = { display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 };
  const num = {
    flex: "0 0 26px", height: 26, borderRadius: 13, background: NAVY, color: "#fff",
    fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center"
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Install In2Fest on iPhone"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 10001, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 420, background: "#fff", color: NAVY, borderRadius: 16,
          padding: 20, boxShadow: "0 20px 50px rgba(0,0,0,0.3)", fontFamily: "inherit"
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Install In2Fest</div>
        <div style={{ fontSize: 13, color: "#6d7591", marginBottom: 16 }}>
          Add the app to your Home Screen in 3 quick steps:
        </div>
        <div style={step}>
          <span style={num}>1</span>
          <span style={{ fontSize: 14, lineHeight: 1.45 }}>
            Open this page in <b>Safari</b> and tap the <b>Share</b> button (square with an up arrow).
          </span>
        </div>
        <div style={step}>
          <span style={num}>2</span>
          <span style={{ fontSize: 14, lineHeight: 1.45 }}>
            Scroll down and tap <b>Add to Home Screen</b>.
          </span>
        </div>
        <div style={step}>
          <span style={num}>3</span>
          <span style={{ fontSize: 14, lineHeight: 1.45 }}>
            Tap <b>Add</b>. Open In2Fest from your Home Screen and log in once.
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%", marginTop: 6, border: 0, borderRadius: 10, padding: "12px 16px",
            background: RED, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer"
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

/**
 * "Install App" button. Renders nothing when the app is already installed,
 * when the browser cannot install it, or when not on the app host.
 * Optional props: label, className, style, onInstalled.
 */
export default function InstallAppButton({ label = "Install App", className = "", style = {}, onInstalled }) {
  const pwa = useSyncExternalStore(subscribe, getSnapshot);
  const [showIos, setShowIos] = useState(false);

  if (!isAppHost() || pwa.installed) return null;
  if (!pwa.canInstall && !pwa.ios) return null;

  const handleClick = async () => {
    if (pwa.canInstall) {
      const outcome = await promptInstall();
      if (outcome === "accepted" && onInstalled) onInstalled();
    } else if (pwa.ios) {
      setShowIos(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={className}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8, border: 0, borderRadius: 10,
          padding: "9px 14px", background: RED, color: "#fff", fontSize: 14, fontWeight: 600,
          cursor: "pointer", whiteSpace: "nowrap", ...style
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v12" />
          <path d="M7 10l5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
        {label}
      </button>
      {showIos && <IosGuide onClose={() => setShowIos(false)} />}
    </>
  );
}