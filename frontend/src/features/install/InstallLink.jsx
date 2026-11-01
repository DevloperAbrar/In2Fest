import React, { useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { subscribe, getSnapshot, isAppHost } from "../../pwa/pwa";

// Small "Install app" link for the login page.
// Hidden when the app is already installed (opened in standalone mode) or when not on the app host.
export default function InstallLink({ className = "" }) {
  const pwa = useSyncExternalStore(subscribe, getSnapshot);
  if (!isAppHost() || pwa.installed) return null;

  return (
    <Link
      to="/install"
      className={`inline-flex items-center gap-2 text-[13px] font-semibold text-primary-600 hover:text-primary-700 transition-colors ${className}`}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3v12" />
        <path d="M7 10l5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
      Install In2Fest app
    </Link>
  );
}