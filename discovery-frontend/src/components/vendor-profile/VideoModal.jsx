import React, { useEffect } from "react";
import { X } from "lucide-react";

export default function VideoModal({ embed, title = "Intro video", onClose }) {
  // Close on Escape + lock page scroll while the video is open
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const portrait = embed.ratio === "portrait";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`relative w-full ${portrait ? "max-w-sm" : "max-w-4xl"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close video"
          className="absolute -top-11 right-0 flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors"
        >
          <X size={18} /> Close
        </button>

        <div
          className={`w-full rounded-2xl overflow-hidden bg-black shadow-2xl ${
            portrait ? "h-[70vh] max-h-[640px]" : "aspect-video"
          }`}
        >
          {embed.type === "video" ? (
            <video src={embed.src} controls autoPlay playsInline className="w-full h-full bg-black" />
          ) : (
            <iframe
              src={embed.src}
              title={title}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          )}
        </div>
      </div>
    </div>
  );
}