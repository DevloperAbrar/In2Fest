import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Share2, Check, ChevronDown } from "lucide-react";
import { Reveal } from "../home/landing/ui";

export const rupee = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

/* ------------------------------------------------------------------ */
/* Section card: the one card style used by every block on the page    */
/* ------------------------------------------------------------------ */
export function SectionCard({
  id,
  icon: Icon,
  title,
  subtitle,
  action,
  children,
  className = "",
  delay = 0,
}) {
  return (
    <Reveal delay={delay} y={20}>
      <section
        id={id}
        className={`scroll-mt-36 bg-white border border-gray-100 rounded-3xl p-5 md:p-7 shadow-[0_1px_2px_rgba(11,14,28,0.04),0_10px_28px_-14px_rgba(11,14,28,0.10)] ${className}`}
      >
        {(title || action) && (
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3 min-w-0">
              {Icon && (
                <span className="w-10 h-10 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center flex-shrink-0">
                  <Icon size={19} />
                </span>
              )}
              <div className="min-w-0">
                <h2 className="font-display font-bold text-navy-900 text-lg md:text-xl leading-tight">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-xs md:text-[13px] text-gray-500 mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>
            {action}
          </div>
        )}
        {children}
      </section>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* Long text with "Read more"                                          */
/* ------------------------------------------------------------------ */
export function ExpandableText({ text, limit = 360 }) {
  const [open, setOpen] = useState(false);
  const long = String(text || "").length > limit;

  return (
    <div>
      <p
        className={`text-[15px] text-gray-600 leading-relaxed whitespace-pre-line ${
          !open && long ? "line-clamp-6" : ""
        }`}
      >
        {text}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-accent-600 hover:text-accent-700"
        >
          {open ? "Show less" : "Read more"}
          <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sticky tab bar with scroll-spy                                      */
/* ------------------------------------------------------------------ */
export function SectionNav({ items }) {
  const [active, setActive] = useState(items[0]?.id);
  const barRef = useRef(null);
  const key = items.map((i) => i.id).join("|");

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean);
    if (!els.length || typeof IntersectionObserver === "undefined") return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-150px 0px -55% 0px", threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // keep the active tab centred on small screens
  useEffect(() => {
    const bar = barRef.current;
    const btn = bar?.querySelector(`[data-tab="${active}"]`);
    if (bar && btn) {
      bar.scrollTo({
        left: btn.offsetLeft - bar.clientWidth / 2 + btn.clientWidth / 2,
        behavior: "smooth",
      });
    }
  }, [active]);

  const go = (id) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (items.length < 2) return null;

  return (
    <div className="sticky top-[68px] z-20 bg-white/85 backdrop-blur-xl border-b border-gray-100">
      <div ref={barRef} className="max-w-6xl mx-auto px-2 md:px-4 flex overflow-x-auto no-scrollbar">
        {items.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              data-tab={t.id}
              onClick={() => go(t.id)}
              className={`relative px-4 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                on ? "text-navy-900" : "text-gray-400 hover:text-gray-700"
              }`}
            >
              {t.label}
              {on && (
                <motion.span
                  layoutId="vp-tab-underline"
                  className="absolute left-3 right-3 bottom-0 h-[3px] rounded-full bg-gradient-to-r from-accent-500 to-gold-500"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Share button (native share sheet on phones, copy link on desktop)   */
/* ------------------------------------------------------------------ */
const SHARE_STYLES = {
  glass:
    "w-10 h-10 rounded-full bg-white/90 backdrop-blur-md text-navy-800 shadow-lg hover:bg-white hover:scale-105",
  outline:
    "flex-1 gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50",
};

export function ShareButton({ title, variant = "glass", className = "" }) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* visitor closed the share sheet */
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Share this business"
      className={`relative inline-flex items-center justify-center transition-all ${SHARE_STYLES[variant]} ${className}`}
    >
      {copied ? <Check size={16} className="text-emerald-600" /> : <Share2 size={16} />}
      {variant === "outline" && <span>{copied ? "Link copied" : "Share"}</span>}
      {variant === "glass" && copied && (
        <span className="absolute top-12 right-0 whitespace-nowrap bg-navy-900 text-white text-xs px-2.5 py-1 rounded-lg">
          Link copied
        </span>
      )}
    </button>
  );
}