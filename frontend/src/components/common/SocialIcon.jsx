import React from "react";

// Brand glyphs drawn as inline SVG (lucide-react no longer ships brand icons).
// Uses currentColor, so colour it with CSS.
const FILLED = new Set(["facebook", "x", "linkedin"]);

function Glyph({ platform }) {
  switch (platform) {
    case "instagram":
      return (
        <>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </>
      );
    case "youtube":
      return (
        <>
          <rect x="2" y="5" width="20" height="14" rx="4" />
          <path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none" />
        </>
      );
    case "facebook":
      return (
        <path d="M13.5 21v-8h2.7l.4-3.2h-3.1V7.9c0-.9.3-1.5 1.6-1.5h1.6V3.5c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.4H7.8V13h2.7v8h3z" />
      );
    case "x":
      return (
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      );
    case "linkedin":
      return (
        <>
          <rect x="3" y="9" width="4" height="12" rx="0.6" />
          <circle cx="5" cy="5" r="2.1" />
          <path d="M10 9h3.8v1.7c.6-1.1 1.9-2 3.9-2 3.5 0 4.3 2.3 4.3 5.3V21h-4v-5.8c0-1.4-.1-2.7-1.7-2.7S14 13.8 14 15.1V21h-4V9z" />
        </>
      );
    case "whatsapp":
      return (
        <>
          <path d="M3 21l1.6-4.8A9 9 0 1 1 8 19.5L3 21z" />
          <g transform="translate(7.6 7.6) scale(0.38)">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" strokeWidth="2.6" />
          </g>
        </>
      );
    case "telegram":
      return (
        <>
          <path d="M21.5 3.5L2.5 10.8l6.3 2.4L11 20l3.4-4.1 5 3.8L21.5 3.5z" />
          <path d="M8.8 13.2l12.7-9.7" />
        </>
      );
    case "threads":
      return (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
        </>
      );
    case "google_business":
      return (
        <>
          <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" />
          <circle cx="12" cy="10" r="2.6" />
        </>
      );
    case "website":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
        </>
      );
    default:
      return (
        <>
          <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
          <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
        </>
      );
  }
}

export default function SocialIcon({ platform, size = 20, strokeWidth = 1.8, className = "" }) {
  const filled = FILLED.has(platform);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <Glyph platform={platform} />
    </svg>
  );
}