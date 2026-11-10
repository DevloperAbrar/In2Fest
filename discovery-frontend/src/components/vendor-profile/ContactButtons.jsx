import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, MessageCircle, Send, Copy, Check, ExternalLink, ShieldCheck } from "lucide-react";
import SaveButton from "./SaveButton";
import { ShareButton } from "./ProfileKit";

const digits = (v) => String(v || "").replace(/\D/g, "");

// Use the vertical-specific WhatsApp link when we have it, otherwise fall back to a plain wa.me link.
function resolveWhatsApp(venue, waLink) {
  if (waLink) return waLink;
  const d = digits(venue.whatsapp_number || venue.phone);
  return d ? `https://wa.me/${d}` : null;
}

/* ------------------------------------------------------------------ */
/* Inline buttons (used under the identity block on phones/tablets)    */
/* ------------------------------------------------------------------ */
export default function ContactButtons({
  venue,
  waLink,
  onSendInquiry,
  whatsappLabel = "WhatsApp",
  inquiryLabel = "Send Inquiry",
}) {
  const wa = resolveWhatsApp(venue, waLink);
  const hasInquiry = typeof onSendInquiry === "function";
  const both = !!venue.phone && !!wa;
  const span = both ? "" : "col-span-2";

  if (!venue.phone && !wa && !hasInquiry) return null;

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {venue.phone && (
        <a
          href={`tel:${venue.phone}`}
          className={`${span} flex items-center justify-center gap-2 bg-navy-50 text-navy-800 text-sm font-semibold px-4 py-3 rounded-xl hover:bg-navy-100 active:scale-[0.98] transition-all`}
        >
          <Phone size={16} /> Call Now
        </a>
      )}
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className={`${span} flex items-center justify-center gap-2 bg-green-500 text-white text-sm font-semibold px-4 py-3 rounded-xl hover:bg-green-600 active:scale-[0.98] transition-all`}
        >
          <MessageCircle size={16} /> {whatsappLabel}
        </a>
      )}
      {hasInquiry && (
        <button
          type="button"
          onClick={onSendInquiry}
          className="col-span-2 flex items-center justify-center gap-2 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-md shadow-accent-500/25 hover:opacity-95 active:scale-[0.98] transition-all bg-gradient-to-r from-accent-500 to-accent-600"
        >
          <Send size={16} /> {inquiryLabel}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Desktop sticky contact card                                         */
/* ------------------------------------------------------------------ */
export function ContactCard({
  venue,
  waLink,
  onSendInquiry,
  priceText,
  priceLabel = "Starting from",
  websiteUrl,
  whatsappLabel = "WhatsApp Now",
  inquiryLabel = "Send Inquiry",
}) {
  const [copied, setCopied] = useState(false);
  const wa = resolveWhatsApp(venue, waLink);
  const hasInquiry = typeof onSendInquiry === "function";
  const number = venue.whatsapp_number || venue.phone;
  const onRequest = priceText === "On request";

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(number);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-[0_20px_50px_-20px_rgba(11,14,28,0.25)]">
      <div className="relative bg-gradient-to-br from-navy-700 to-navy-900 text-white px-6 py-5 overflow-hidden">
        <div className="absolute -top-12 -right-10 w-40 h-40 rounded-full bg-gold-500/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-14 -left-8 w-32 h-32 rounded-full bg-accent-500/20 blur-3xl pointer-events-none" />
        <p className="relative text-xs uppercase tracking-wider text-white/60 font-semibold">
          {onRequest ? "Pricing" : priceLabel}
        </p>
        <p className="relative font-display font-extrabold text-3xl text-gold-400 mt-1 leading-none">
          {onRequest ? "Price on request" : priceText}
        </p>
        <p className="relative text-xs text-white/55 mt-2.5">
          Set by the business. Confirm the latest price when you contact them.
        </p>
      </div>

      <div className="p-5 space-y-2.5">
        {hasInquiry && (
          <button
            type="button"
            onClick={onSendInquiry}
            className="flex items-center justify-center gap-2 w-full text-white text-sm font-bold px-4 py-3.5 rounded-xl shadow-md shadow-accent-500/25 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all bg-gradient-to-r from-accent-500 to-accent-600"
          >
            <Send size={16} /> {inquiryLabel}
          </button>
        )}

        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white text-sm font-bold px-4 py-3.5 rounded-xl hover:-translate-y-0.5 transition-all"
          >
            <MessageCircle size={16} /> {whatsappLabel}
          </a>
        )}

        {venue.phone && (
          <a
            href={`tel:${venue.phone}`}
            className="flex items-center justify-center gap-2 w-full bg-navy-50 hover:bg-navy-100 text-navy-800 text-sm font-bold px-4 py-3.5 rounded-xl transition-colors"
          >
            <Phone size={16} /> Call {venue.phone}
          </a>
        )}

        {websiteUrl && (
          <a
            href={websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full border border-navy-100 text-navy-700 hover:bg-navy-50 text-sm font-semibold px-4 py-3 rounded-xl transition-colors"
          >
            <ExternalLink size={15} /> Visit their website
          </a>
        )}

        <div className="flex gap-2.5 pt-1">
          <SaveButton venue={venue} variant="outline" />
          <ShareButton title={venue.hall_name} variant="outline" />
        </div>

        {number && (
          <button
            type="button"
            onClick={copyNumber}
            className="flex items-center justify-center gap-2 w-full text-xs font-medium text-gray-500 hover:text-gray-800 py-1.5 transition-colors"
          >
            {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            {copied ? "Number copied" : "Copy number"}
          </button>
        )}

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 pt-1">
          <ShieldCheck size={13} className="text-emerald-500" />
          No commission. You deal directly with the business.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile sticky action bar (appears after the visitor scrolls)        */
/* ------------------------------------------------------------------ */
export function MobileActionBar({ venue, waLink, onSendInquiry, priceText }) {
  const [show, setShow] = useState(false);
  const wa = resolveWhatsApp(venue, waLink);
  const hasInquiry = typeof onSendInquiry === "function";

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const nearEnd = window.innerHeight + y > document.documentElement.scrollHeight - 420;
      setShow(y > 380 && !nearEnd);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!venue.phone && !wa && !hasInquiry) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="lg:hidden fixed inset-x-0 bottom-16 md:bottom-0 z-30 bg-white/95 backdrop-blur-xl border-t border-gray-200 px-3 py-2.5 shadow-[0_-10px_30px_-12px_rgba(11,14,28,0.25)]"
        >
          <div className="max-w-2xl mx-auto flex items-center gap-2">
            {priceText && (
              <div className="min-w-0 pr-1">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold leading-none">From</p>
                <p className="font-display font-extrabold text-navy-900 text-sm leading-tight mt-1 truncate">{priceText}</p>
              </div>
            )}

            {venue.phone && (
              <a
                href={`tel:${venue.phone}`}
                aria-label="Call"
                className="w-11 h-11 flex-shrink-0 rounded-xl bg-navy-50 text-navy-800 flex items-center justify-center active:scale-95 transition-transform"
              >
                <Phone size={18} />
              </a>
            )}

            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className={`h-11 rounded-xl bg-green-500 text-white flex items-center justify-center gap-2 text-sm font-bold active:scale-95 transition-transform ${
                  hasInquiry ? "w-11 flex-shrink-0" : "flex-1"
                }`}
              >
                <MessageCircle size={18} />
                {!hasInquiry && <span>WhatsApp</span>}
              </a>
            )}

            {hasInquiry && (
              <button
                type="button"
                onClick={onSendInquiry}
                className="flex-1 h-11 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-accent-500 to-accent-600 active:scale-95 transition-transform"
              >
                <Send size={16} /> Send Inquiry
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}