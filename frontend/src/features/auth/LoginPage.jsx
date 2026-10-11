import React, { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Building2,
  Camera,
  CalendarCheck2,
  Globe2,
  IndianRupee,
  Music,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Star,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import GoogleLoginButton from "./GoogleLoginButton.jsx";
import { showError } from "../../components/common/Toast";
import logo from "../../assets/logo.png";

/*
  Photos are picked up automatically from  src/assets/login/
  Put these 4 files in that folder (jpg / jpeg / png / webp all work):
    venue.jpg        -> Venues tile
    photography.jpg  -> Photographers tile
    catering.jpg     -> Catering tile
    music.jpg        -> Music & Entertainment tile
  If a file is missing, that tile shows a branded gradient instead,
  so the page never breaks.
*/
const loginImages = import.meta.glob(
  "../../assets/login/*.{jpg,jpeg,png,webp}",
  { eager: true, import: "default" }
);

function pickImage(name) {
  const hit = Object.entries(loginImages).find(([path]) =>
    new RegExp(`/${name}\\.(jpe?g|png|webp)$`, "i").test(path)
  );
  return hit ? hit[1] : null;
}

const TILES = [
  {
    key: "venue",
    label: "Venues",
    shortLabel: "Venues",
    icon: Building2,
    gradient: "from-navy-700 to-primary-700",
    img: pickImage("venue"),
  },
  {
    key: "photography",
    label: "Photographers",
    shortLabel: "Photographers",
    icon: Camera,
    gradient: "from-primary-600 to-gold-500",
    img: pickImage("photography"),
  },
  {
    key: "catering",
    label: "Catering",
    shortLabel: "Catering",
    icon: UtensilsCrossed,
    gradient: "from-gold-500 to-primary-500",
    img: pickImage("catering"),
  },
  {
    key: "music",
    label: "Music & Entertainment",
    shortLabel: "Music & DJs",
    icon: Music,
    gradient: "from-navy-600 to-navy-900",
    img: pickImage("music"),
  },
];

const FEATURES = [
  { icon: Globe2, label: "Your own website" },
  { icon: CalendarCheck2, label: "Smart calendar" },
  { icon: ReceiptText, label: "Billing" },
  { icon: Star, label: "Reviews" },
  { icon: Users, label: "Client management" },
];

const AVATARS = [
  { initials: "RS", bg: "bg-primary-500" },
  { initials: "AK", bg: "bg-navy-700" },
  { initials: "MP", bg: "bg-gold-500" },
  { initials: "SJ", bg: "bg-primary-700" },
];

const EASE = [0.22, 1, 0.36, 1];

/* One photo tile - falls back to a branded gradient + icon if no photo */
function Tile({ tile, className = "", style, delay = 0, compact = false }) {
  const Icon = tile.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      style={style}
      className={`relative min-h-0 overflow-hidden bg-gradient-to-br ${tile.gradient} ${
        compact ? "rounded-xl" : "rounded-2xl"
      } ${className}`}
    >
      {tile.img ? (
        <img
          src={tile.img}
          alt={tile.label}
          loading="eager"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <Icon
          size={compact ? 36 : 72}
          strokeWidth={1.2}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/25"
        />
      )}
      <div
        className={`absolute inset-x-0 ${
          compact
            ? "top-0 h-1/2 bg-gradient-to-b from-navy-900/55"
            : "bottom-0 h-1/2 bg-gradient-to-t from-navy-900/70"
        } to-transparent`}
      />
      <span
        className={`absolute inline-flex items-center text-white bg-white/15 backdrop-blur-md border border-white/25 rounded-full font-semibold ${
          compact
            ? "top-2 left-2 gap-1 text-[10px] px-2 py-0.5 bg-navy-900/35"
            : "bottom-3 left-3 gap-1.5 text-[11px] px-2.5 py-1"
        }`}
      >
        <Icon size={compact ? 10 : 12} />
        {compact ? tile.shortLabel : tile.label}
      </span>
    </motion.div>
  );
}

/* A floating white card that gently bobs up and down */
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
        transition={{
          duration: 5 + delay * 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_12px_40px_-12px_rgba(11,14,28,0.5)] border border-white/60"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export default function LoginPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const reduce = useReducedMotion();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      showError(error);
      searchParams.delete("error");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="min-h-screen bg-paper font-sans lg:grid lg:grid-cols-[5fr_6fr]">
      {/* ───────────── LEFT: sign-in (also the whole page on mobile/tablet) ───────────── */}
      <div className="relative flex flex-col min-h-screen px-5 sm:px-12 xl:px-20 py-6 sm:py-8">
        <Link to="/" className="w-fit">
          <img src={logo} alt="In2Fest" className="h-7 sm:h-8 w-auto" />
        </Link>

        <div className="flex-1 flex items-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE }}
            className="w-full max-w-md mx-auto lg:mx-0 py-6 sm:py-10"
          >
            {/* ── Mobile / tablet hero: same photo mosaic, compact ── */}
            <div className="lg:hidden mb-8">
              <div className="rounded-3xl bg-navy-900 p-2.5 shadow-card">
                <div className="relative">
                  <div className="grid grid-cols-2 grid-rows-5 gap-2 h-64 sm:h-72">
                    <Tile tile={TILES[0]} compact delay={0.1} className="col-start-1 row-start-1 row-span-3" />
                    <Tile tile={TILES[1]} compact delay={0.18} className="col-start-2 row-start-1 row-span-2" />
                    <Tile tile={TILES[2]} compact delay={0.25} className="col-start-1 row-start-4 row-span-2" />
                    <Tile tile={TILES[3]} compact delay={0.32} className="col-start-2 row-start-3 row-span-3" />
                  </div>

                  {/* two small floating chips straddling the bottom edge */}
                  <FloatCard className="-bottom-4 left-2" delay={0.5} reduce={reduce}>
                    <div className="flex items-center gap-2 p-2 pr-3">
                      <span className="w-7 h-7 rounded-full bg-gold-100 flex items-center justify-center shrink-0">
                        <IndianRupee size={14} className="text-gold-600" />
                      </span>
                      <div>
                        <p className="text-[10px] text-navy-400 leading-none">
                          Payment received
                        </p>
                        <p className="text-xs font-semibold text-navy-900 mt-0.5">
                          ₹45,000
                        </p>
                      </div>
                    </div>
                  </FloatCard>

                  <FloatCard className="-bottom-4 right-2" delay={0.7} reduce={reduce}>
                    <div className="p-2 px-3">
                      <div className="flex gap-0.5">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <Star key={i} size={11} className="fill-gold-500 text-gold-500" />
                        ))}
                      </div>
                      <p className="text-[10px] text-navy-400 mt-1 leading-none">
                        New review
                      </p>
                    </div>
                  </FloatCard>
                </div>

                <div className="px-2 pt-8 pb-4">
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-white leading-snug tracking-tight">
                    <span className="whitespace-nowrap">Get found. Get booked.</span>{" "}
                    <span className="text-gold-400 whitespace-nowrap">Get paid.</span>
                  </h2>
                </div>
              </div>
            </div>

            <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary-600 bg-primary-50 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
              For every event business
            </span>

            <h1 className="mt-5 font-display text-3xl sm:text-[34px] font-bold text-navy-900 tracking-tight leading-tight">
              Welcome back
            </h1>
            <p className="mt-2.5 text-[15px] text-navy-400 leading-relaxed">
              Sign in to manage your bookings, website, billing and client
              inquiries - all from one dashboard.
            </p>

            <div className="mt-8">
              <GoogleLoginButton />
            </div>

            <div className="mt-6 flex items-start gap-2 text-xs text-navy-400">
              <ShieldCheck size={15} className="text-navy-300 shrink-0 mt-px" />
              Secure sign-in with your Google account. We never post anything.
            </div>

            {/* Social proof */}
            <div className="mt-10 pt-8 border-t border-navy-100 flex items-center gap-4">
              <div className="flex -space-x-1.5 shrink-0">
                {AVATARS.map((a) => (
                  <span
                    key={a.initials}
                    className={`w-9 h-9 rounded-full ${a.bg} text-white text-[11px] font-semibold flex items-center justify-center ring-[3px] ring-paper`}
                  >
                    {a.initials}
                  </span>
                ))}
              </div>
              <p className="text-[13px] text-navy-500 leading-snug">
                Trusted by event businesses across India
              </p>
            </div>
          </motion.div>
        </div>

        <p className="text-xs text-navy-300 text-center lg:text-left">
          © {new Date().getFullYear()}{" "}
          <a
            href="https://campussafar.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-navy-500 transition-colors"
          >
            Campussafar Technologies Private Limited®
          </a>
          . In2Fest™ is a trademark.
        </p>
      </div>

      {/* ───────────── RIGHT: category mosaic (desktop only) ───────────── */}
      <div className="hidden lg:block p-4 pl-0">
        <div className="relative h-full min-h-[calc(100vh-2rem)] rounded-[2rem] overflow-hidden bg-navy-900 flex flex-col p-5 xl:p-6">
          {/* soft brand glows */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-primary-600/25 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-gold-500/20 blur-[100px]" />

          {/* Mosaic + floating cards */}
          <div className="relative flex-1 min-h-0">
            <div className="absolute inset-0 flex gap-3">
              <div className="flex-1 flex flex-col gap-3 min-h-0">
                <Tile tile={TILES[0]} delay={0.1} className="basis-0" style={{ flexGrow: 3 }} />
                <Tile tile={TILES[2]} delay={0.25} className="basis-0" style={{ flexGrow: 2 }} />
              </div>
              <div className="flex-1 flex flex-col gap-3 min-h-0">
                <Tile tile={TILES[1]} delay={0.18} className="basis-0" style={{ flexGrow: 2 }} />
                <Tile tile={TILES[3]} delay={0.32} className="basis-0" style={{ flexGrow: 3 }} />
              </div>
            </div>

            {/* Card: new inquiry */}
            <FloatCard className="top-6 left-5" delay={0.5} reduce={reduce}>
              <div className="flex items-center gap-3 p-3.5 pr-5">
                <span className="w-10 h-10 rounded-full bg-[#25D366]/15 flex items-center justify-center">
                  <MessageCircle size={19} className="text-[#1da851]" />
                </span>
                <div>
                  <p className="text-[11px] text-navy-400 leading-none">New inquiry</p>
                  <p className="text-sm font-semibold text-navy-900 mt-1">
                    Corporate event · 120 guests
                  </p>
                </div>
              </div>
            </FloatCard>

            {/* Card: review */}
            <FloatCard className="top-[44%] right-5" delay={0.7} reduce={reduce}>
              <div className="p-3.5 pr-5">
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} size={13} className="fill-gold-500 text-gold-500" />
                  ))}
                </div>
                <p className="text-sm font-semibold text-navy-900 mt-1.5">
                  “Super smooth booking!”
                </p>
                <p className="text-[11px] text-navy-400 mt-0.5">New 5-star review</p>
              </div>
            </FloatCard>

            {/* Card: payment (sits above the Catering label) */}
            <FloatCard className="bottom-20 left-5" delay={0.9} reduce={reduce}>
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

          {/* Headline + feature chips */}
          <div className="relative pt-7 px-1">
            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
              className="font-display text-3xl xl:text-4xl font-bold text-white leading-tight tracking-tight"
            >
              <span className="whitespace-nowrap">Get found. Get booked.</span>{" "}
              <span className="text-gold-400 whitespace-nowrap">Get paid.</span>
            </motion.h2>
            <p className="mt-3 text-sm text-white/70 max-w-lg leading-relaxed">
              Website, bookings, billing, reviews and clients - one platform for
              every kind of event business.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {FEATURES.map(({ icon: Icon, label }, i) => (
                <motion.span
                  key={label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.07, ease: EASE }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3 py-1.5"
                >
                  <Icon size={13} className="text-gold-400" />
                  {label}
                </motion.span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}