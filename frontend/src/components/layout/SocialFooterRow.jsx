import React from "react";
import SocialIcon from "../common/SocialIcon.jsx";
import { getPlatform, getSocialLinks } from "../../lib/socialPlatforms";

// Small round social icons for the website footer. Renders nothing when the
// vendor has no (visible) Social Media Links section.
export default function SocialFooterRow({ venue }) {
  const links = getSocialLinks(venue);
  if (!links.length) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 mb-5">
      {links.map((l) => {
        const p = getPlatform(l.platform);
        return (
          <a
            key={l.id || l.href}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            title={p.label}
            aria-label={`${p.label} (opens in a new tab)`}
            style={{ "--c": p.color }}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-stone-300 ring-1 ring-white/10 transition-all duration-300 hover:bg-[var(--c)] hover:text-white hover:-translate-y-1 hover:scale-110 hover:ring-white/30 active:scale-95"
          >
            <SocialIcon platform={l.platform} size={18} />
          </a>
        );
      })}
    </div>
  );
}