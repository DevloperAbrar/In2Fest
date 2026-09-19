import React from "react";

// Full-height loader used while a lazy route chunk or page data is loading.
// The height keeps the footer below the fold so it never flashes before the page renders.
export default function PageLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center gap-6"
    >
      <img
        src="/logo.png"
        alt=""
        aria-hidden="true"
        className="h-10 w-auto animate-pulse"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-navy-100 border-t-accent-500" />
      <span className="sr-only">Loading</span>
    </div>
  );
}