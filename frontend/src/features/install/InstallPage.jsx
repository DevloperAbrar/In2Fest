import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Smartphone,
  Monitor,
  Zap,
  ShieldCheck,
  Download,
  Copy,
  Check,
  Info,
  X,
  CalendarCheck2,
  IndianRupee,
  MessageCircle,
  ReceiptText,
  Star,
} from "lucide-react";
import { subscribe, getSnapshot, isAppHost, promptInstall } from "../../pwa/pwa";
import logo from "../../assets/logo.png";

const INSTALL_URL = "https://app.in2fest.com/install";
// Android only: forces the link to open in Chrome (works from WhatsApp / Instagram / Facebook browsers)
const CHROME_INTENT = `intent://app.in2fest.com/install#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(
  INSTALL_URL
)};end`;
const EASE = [0.22, 1, 0.36, 1];

const PRIMARY_BTN =
  "w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-semibold py-4 text-base shadow-[0_10px_28px_-10px_rgba(232,25,44,0.65)] transition-colors";

const BENEFITS = [
  { icon: Zap, title: "Instant access", text: "Open from your home screen or desktop" },
  { icon: Smartphone, title: "Full screen", text: "No browser bar, feels like a real app" },
  { icon: ShieldCheck, title: "Same login", text: "Same account and data, nothing changes" },
];

const TABS = [
  { key: "android", label: "Android", icon: Smartphone },
  { key: "iphone", label: "iPhone", icon: Smartphone },
  { key: "computer", label: "Computer", icon: Monitor },
];

const STEPS = {
  android: [
    <>Open this page in <b>Chrome</b> and tap the <b>⋮</b> menu (top right).</>,
    <>Tap <b>Install app</b>. If you only see <b>Add to Home screen</b>, tap that and then tap <b>Install</b>.</>,
    <>Tap <b>Install</b> to confirm. In2Fest will appear on your home screen.</>,
  ],
  iphone: [
    <>Open this page in <b>Safari</b> and tap the <b>Share</b> button (square with an up arrow).</>,
    <>Scroll down and tap <b>Add to Home Screen</b>.</>,
    <>Tap <b>Add</b>. Open In2Fest from your Home Screen and log in once.</>,
  ],
  computer: [
    <>Open this page in <b>Google Chrome</b> or <b>Microsoft Edge</b> (Firefox cannot install web apps).</>,
    <>
      Click the <b>install icon</b> at the right end of the address bar. Not there? Chrome: <b>⋮</b> → Cast, save and
      share → <b>Install In2Fest</b>. Edge: <b>⋯</b> → Apps → <b>Install this site as an app</b>.
    </>,
    <>Click <b>Install</b> to confirm.</>,
  ],
};

function detectEnv() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  return {
    inApp: /FBAN|FBAV|Instagram|WhatsApp|MicroMessenger|Snapchat|Line\/|; wv\)/i.test(ua),
    android: /android/i.test(ua),
  };
}

/* A floating white card that gently bobs up and down (same look as the login page) */
function FloatCard({ className = "", delay = 0, reduce, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className={`absolute z-10 ${className}`}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 5 + delay * 2, repeat: Infinity, ease: "easeInOut" }}
        className="bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_12px_40px_-12px_rgba(11,14,28,0.5)] border border-white/60"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/* CSS-only phone with a tiny dashboard preview */
function PhoneMock() {
  const rows = [
    { icon: CalendarCheck2, label: "Wedding · 14 Nov", meta: "Confirmed" },
    { icon: MessageCircle, label: "New inquiry", meta: "2 min ago" },
    { icon: ReceiptText, label: "Invoice #1042", meta: "Paid" },
  ];
  return (
    <div className="relative w-[250px] h-[500px] rounded-[2.6rem] bg-navy-900 p-2.5 border border-white/20 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]">
      <div className="relative h-full w-full rounded-[2.1rem] bg-paper overflow-hidden">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full bg-navy-900" />
        <div className="pt-11 px-4">
          <img src={logo} alt="" className="h-5 w-auto" />
          <p className="mt-5 text-[11px] text-navy-400">This month</p>
          <p className="font-display text-2xl font-bold text-navy-900 leading-tight">₹1,24,500</p>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-white border border-navy-100 p-3">
              <p className="text-[10px] text-navy-400">Bookings</p>
              <p className="font-display text-lg font-bold text-navy-900">12</p>
            </div>
            <div className="rounded-2xl bg-white border border-navy-100 p-3">
              <p className="text-[10px] text-navy-400">Inquiries</p>
              <p className="font-display text-lg font-bold text-primary-600">5</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {rows.map(({ icon: Icon, label, meta }) => (
              <div key={label} className="flex items-center gap-2.5 rounded-2xl bg-white border border-navy-100 p-2.5">
                <span className="w-7 h-7 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                  <Icon size={13} className="text-primary-600" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-navy-900 truncate">{label}</p>
                  <p className="text-[10px] text-navy-400">{meta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Steps({ items }) {
  return (
    <ol className="mt-4 space-y-3.5">
      {items.map((text, i) => (
        <li key={i} className="flex gap-3 items-start">
          <span className="shrink-0 w-6 h-6 rounded-full bg-navy-900 text-white text-xs font-bold flex items-center justify-center">
            {i + 1}
          </span>
          <span className="text-sm text-navy-500 leading-relaxed">{text}</span>
        </li>
      ))}
    </ol>
  );
}

function ManualGuide({ tab, setTab }) {
  return (
    <div>
      <div className="flex w-full rounded-xl bg-navy-100/50 p-1 gap-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-semibold transition-colors ${
              tab === key ? "bg-white text-navy-900 shadow-sm" : "text-navy-400 hover:text-navy-600"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <Steps items={STEPS[tab]} />

      <details className="mt-5 rounded-2xl bg-paper border border-navy-100 px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-navy-900">Still not working?</summary>
        <ul className="mt-3 space-y-2 text-sm text-navy-500 leading-relaxed list-disc pl-5">
          <li>Do not use an Incognito / Private tab. Browsers do not allow installing from those.</li>
          <li>Open the link in Chrome, Edge or Safari, not inside WhatsApp, Instagram or Facebook.</li>
          <li>Already installed? Look for In2Fest in your app drawer or home screen.</li>
          <li>Turn off "Desktop site" in the browser menu, then refresh this page.</li>
        </ul>
      </details>
    </div>
  );
}

/* Bottom sheet on phones, centered dialog on larger screens */
function GuideSheet({ onClose, tab, setTab }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How to install In2Fest"
      onClick={onClose}
      className="fixed inset-0 z-[10001] bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display text-xl font-bold text-navy-900">Install In2Fest</h2>
            <p className="mt-0.5 text-sm text-navy-400">Just 3 quick steps. No app store needed.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-paper border border-navy-100 flex items-center justify-center shrink-0 text-navy-500"
          >
            <X size={16} />
          </button>
        </div>

        <ManualGuide tab={tab} setTab={setTab} />

        <button type="button" onClick={onClose} className={`${PRIMARY_BTN} mt-5 !py-3.5 !text-[15px]`}>
          Got it
        </button>
      </motion.div>
    </div>
  );
}

export default function InstallPage() {
  const pwa = useSyncExternalStore(subscribe, getSnapshot);
  const reduce = useReducedMotion();
  const env = useMemo(detectEnv, []);
  const [outcome, setOutcome] = useState(null);
  const [copied, setCopied] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tab, setTab] = useState(() => (pwa.ios ? "iphone" : env.android ? "android" : "computer"));
  const onAppHost = isAppHost();

  useEffect(() => {
    const prev = document.title;
    document.title = "Install In2Fest App";
    return () => {
      document.title = prev;
    };
  }, []);

  // One button for every device:
  // browser gave us the install popup -> show it, otherwise open the step-by-step sheet.
  const handleInstall = async () => {
    if (pwa.canInstall) {
      const result = await promptInstall();
      setOutcome(result);
      return;
    }
    setSheetOpen(true);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link and open it in Chrome or Safari:", INSTALL_URL);
    }
  };

  const hint = pwa.canInstall
    ? "Free · takes about 5 seconds · no app store needed"
    : pwa.ios
    ? "On iPhone, install from the Safari Share menu. Tap the button to see how."
    : "Tap the button and follow 3 quick steps.";

  const renderAction = () => {
    if (!onAppHost) {
      return (
        <div>
          <p className="text-sm text-navy-500 leading-relaxed">
            The app can only be installed from the main In2Fest portal. Open the link below and install from there.
          </p>
          <a href={INSTALL_URL} className={`${PRIMARY_BTN} mt-4`}>
            Go to app.in2fest.com
          </a>
        </div>
      );
    }

    if (pwa.installed) {
      return (
        <div>
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center shrink-0">
              <Check size={20} className="text-gold-600" />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-navy-900">In2Fest is installed on this device</p>
              <p className="mt-0.5 text-sm text-navy-500">Open it from your home screen, app drawer or desktop.</p>
            </div>
          </div>
          <Link to="/dashboard" className={`${PRIMARY_BTN} mt-5`}>
            Open dashboard
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {env.inApp && (
          <div className="rounded-2xl bg-primary-50 p-4">
            <p className="text-sm font-semibold text-primary-700">Open this page in your browser to install</p>
            <p className="mt-1 text-sm text-navy-500 leading-relaxed">
              Installing does not work inside WhatsApp, Instagram or Facebook.
              {env.android ? " Tap below to open it in Chrome." : " Copy the link and open it in Safari."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {env.android && (
                <a
                  href={CHROME_INTENT}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-500 text-white text-sm font-semibold px-4 py-2.5"
                >
                  Open in Chrome
                </a>
              )}
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-2 rounded-xl bg-navy-900 text-white text-sm font-semibold px-4 py-2.5"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Link copied" : "Copy link"}
              </button>
            </div>
          </div>
        )}

        {outcome === "dismissed" && (
          <div className="rounded-2xl bg-paper border border-navy-100 p-4 flex gap-2.5 items-start">
            <Info size={16} className="text-navy-400 shrink-0 mt-0.5" />
            <p className="text-sm text-navy-500 leading-relaxed">
              You closed the install popup. Tap the button again to see the manual steps.
            </p>
          </div>
        )}

        {outcome === "accepted" ? (
          <div className="rounded-2xl bg-gold-100 p-4">
            <p className="text-sm font-semibold text-navy-900">Installing In2Fest...</p>
            <p className="mt-1 text-sm text-navy-500">It will appear on your home screen or desktop in a moment.</p>
          </div>
        ) : (
          <div>
            <button type="button" onClick={handleInstall} className={PRIMARY_BTN}>
              <Download size={20} />
              Install In2Fest app
            </button>
            <p className="mt-2.5 text-center text-xs text-navy-400">{hint}</p>
            {pwa.canInstall && (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="mt-3 mx-auto block text-[13px] font-semibold text-navy-400 hover:text-navy-700 transition-colors"
              >
                Prefer manual steps?
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-paper font-sans lg:grid lg:grid-cols-[6fr_5fr]">
      {/* ───────────── LEFT: content ───────────── */}
      <div className="flex flex-col min-h-screen px-5 sm:px-12 xl:px-20 py-6 sm:py-8">
        <header className="flex items-center justify-between">
          <Link to="/login" className="w-fit">
            <img src={logo} alt="In2Fest" className="h-7 sm:h-8 w-auto" />
          </Link>
          <Link to="/login" className="text-sm font-medium text-navy-400 hover:text-navy-700 transition-colors">
            ← Back to login
          </Link>
        </header>

        <main className="flex-1 flex items-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE }}
            className="w-full max-w-xl py-8 sm:py-10"
          >
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary-600 bg-primary-50 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
              Free · Works on phone and computer
            </span>

            <h1 className="mt-5 font-display text-3xl sm:text-4xl font-bold text-navy-900 tracking-tight leading-tight">
              Get the <span className="text-primary-600">In2Fest</span> app
            </h1>
            <p className="mt-3 text-[15px] text-navy-400 leading-relaxed">
              Add In2Fest to your home screen or desktop for one-tap access to your bookings, billing and client
              inquiries.
            </p>

            {/* Install button first, so it is visible without scrolling on phones */}
            <div className="mt-6 rounded-3xl bg-white border border-navy-100 shadow-card p-5 sm:p-6">
              {renderAction()}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {BENEFITS.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl bg-white border border-navy-100 p-3.5">
                  <span className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
                    <Icon size={15} className="text-primary-600" />
                  </span>
                  <p className="mt-2.5 text-sm font-semibold text-navy-900">{title}</p>
                  <p className="mt-0.5 text-xs text-navy-400 leading-snug">{text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </main>

        <p className="text-xs text-navy-300 text-center lg:text-left">
          © {new Date().getFullYear()} Campussafar Technologies Private Limited®. In2Fest™ is a trademark.
        </p>
      </div>

      {/* ───────────── RIGHT: phone preview (desktop only) ───────────── */}
      <div className="hidden lg:block p-4 pl-0">
        <div className="relative h-full min-h-[calc(100vh-2rem)] rounded-[2rem] overflow-hidden bg-navy-900 flex items-center justify-center">
          <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-primary-600/25 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-gold-500/20 blur-[100px]" />

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
            className="relative"
          >
            <PhoneMock />
          </motion.div>

          <FloatCard className="top-16 left-8 xl:left-12" delay={0.5} reduce={reduce}>
            <div className="flex items-center gap-3 p-3.5 pr-5">
              <span className="w-10 h-10 rounded-full bg-[#25D366]/15 flex items-center justify-center">
                <MessageCircle size={19} className="text-[#1da851]" />
              </span>
              <div>
                <p className="text-[11px] text-navy-400 leading-none">New inquiry</p>
                <p className="text-sm font-semibold text-navy-900 mt-1">Corporate event · 120 guests</p>
              </div>
            </div>
          </FloatCard>

          <FloatCard className="top-[48%] right-6 xl:right-10" delay={0.7} reduce={reduce}>
            <div className="p-3.5 pr-5">
              <div className="flex gap-0.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={13} className="fill-gold-500 text-gold-500" />
                ))}
              </div>
              <p className="text-sm font-semibold text-navy-900 mt-1.5">“Super smooth booking!”</p>
              <p className="text-[11px] text-navy-400 mt-0.5">New 5-star review</p>
            </div>
          </FloatCard>

          <FloatCard className="bottom-16 left-8 xl:left-12" delay={0.9} reduce={reduce}>
            <div className="flex items-center gap-3 p-3.5 pr-5">
              <span className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center">
                <IndianRupee size={18} className="text-gold-600" />
              </span>
              <div>
                <p className="text-[11px] text-navy-400 leading-none">Payment received</p>
                <p className="text-sm font-semibold text-navy-900 mt-1">₹45,000</p>
              </div>
            </div>
          </FloatCard>
        </div>
      </div>

      {sheetOpen && <GuideSheet onClose={() => setSheetOpen(false)} tab={tab} setTab={setTab} />}
    </div>
  );
}