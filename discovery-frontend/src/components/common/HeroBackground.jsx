import React, { useState } from "react";

// ─── Graceful background-image loader for dark hero sections ────────────────
// Drop a file into src/assets (see prop below) and it renders behind the
// content at low opacity with a navy gradient overlay for text contrast.
// If the file doesn't exist yet, it silently falls back to gradient-only -
// nothing breaks.
function tryLoad(path) {
  try { return new URL(`../../assets/${path}`, import.meta.url).href; } catch { return null; }
}

export default function HeroBackground({ file, opacity = 0.28, children, className = "", overlay = "navy" }) {
  const src = tryLoad(file);
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  const overlayGradient =
    overlay === "navy"
      ? "linear-gradient(135deg, rgba(11,14,28,0.94) 0%, rgba(26,32,53,0.90) 45%, rgba(232,25,44,0.55) 100%)"
      : overlay;

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: "#1a2035" }}>
      {showImage && (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity }}
        />
      )}
      <div className="absolute inset-0" style={{ background: overlayGradient }} />
      <div className="relative">{children}</div>
    </div>
  );
}