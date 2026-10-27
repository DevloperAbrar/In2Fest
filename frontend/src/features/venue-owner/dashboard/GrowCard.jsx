import React from "react";
import { Link } from "react-router-dom";
import { Copy, ExternalLink, Pencil, Share2 } from "lucide-react";
import { showSuccess } from "../../../components/common/Toast";
import { Surface } from "./dashboardUi.jsx";

// Website link lives down here on purpose: it's a "grow your business" tool,
// not something vendors need front-and-centre every time they open the app.
export default function GrowCard({ publicUrl, canEditWebsite = true }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      showSuccess("Link copied to clipboard");
    } catch {
      showSuccess(publicUrl);
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Our website", url: publicUrl });
        return;
      } catch {
        /* user dismissed the share sheet */
        return;
      }
    }
    copy();
  };

  const displayUrl = publicUrl.replace(/^https?:\/\//, "");

  return (
    <Surface className="p-4 md:p-5">
      <div className="flex items-center gap-3.5">
        <span className="w-11 h-11 rounded-2xl bg-navy-900 flex items-center justify-center shrink-0" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18" />
            <path d="M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3Z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-navy-400">Your public website</p>
          <p className="font-display font-semibold text-[14.5px] text-navy-900 truncate">{displayUrl}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <button onClick={copy} className="tap-scale flex flex-col items-center gap-1 rounded-xl bg-navy-50 py-2.5 text-[11.5px] font-medium text-navy-700 hover:bg-navy-100/70">
          <Copy size={16} /> Copy
        </button>
        <button onClick={share} className="tap-scale flex flex-col items-center gap-1 rounded-xl bg-navy-50 py-2.5 text-[11.5px] font-medium text-navy-700 hover:bg-navy-100/70">
          <Share2 size={16} /> Share
        </button>
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="tap-scale flex flex-col items-center gap-1 rounded-xl bg-navy-50 py-2.5 text-[11.5px] font-medium text-navy-700 hover:bg-navy-100/70"
        >
          <ExternalLink size={16} /> Visit
        </a>
        {canEditWebsite ? (
          <Link
            to="/dashboard/website"
            className="tap-scale flex flex-col items-center gap-1 rounded-xl bg-primary-50 py-2.5 text-[11.5px] font-semibold text-primary-700 hover:bg-primary-100/70"
          >
            <Pencil size={16} /> Edit
          </Link>
        ) : (
          <span />
        )}
      </div>
    </Surface>
  );
}