import React, { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarCheck2, Globe2, MessageCircle, Sparkles } from "lucide-react";
import GoogleLoginButton from "./GoogleLoginButton.jsx";
import { showError } from "../../components/common/Toast";
import logo from "../../assets/logo.png";
import heroLoginImage from "../../assets/hero-login.png";

const POINTS = [
  { icon: Globe2, text: "Your branded booking site, live the same day" },
  { icon: CalendarCheck2, text: "One shared calendar - nothing gets double-booked" },
  { icon: MessageCircle, text: "WhatsApp alerts the moment an inquiry comes in" },
];

export default function LoginPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      showError(error);
      searchParams.delete("error");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-navy-900 font-sans px-4 py-10 sm:py-14 overflow-hidden">
      {/* Ambient gradient / glow background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 w-[26rem] h-[26rem] bg-primary-600/30 rounded-full blur-[120px]" />
        <div className="absolute -bottom-32 -right-24 w-[26rem] h-[26rem] bg-gold-500/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-navy-500/30 rounded-full blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-4xl bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden grid lg:grid-cols-2"
      >
        {/* Brand panel - hidden below lg, photo background with scrim */}
        <div
          className="hidden lg:flex flex-col justify-between px-10 py-10 relative bg-cover bg-center"
          style={{ backgroundImage: `url(${heroLoginImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-navy-900/85 via-navy-900/75 to-navy-900/95" />

          <Link
            to="/"
            className="relative inline-flex items-center gap-1.5 bg-white/95 rounded-xl px-3 py-1.5 backdrop-blur-sm shadow-sm w-fit"
          >
            <img src={logo} alt="In2Fest" className="h-6 w-auto" />
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-w-sm"
          >
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide uppercase text-gold-400 mb-4">
              <Sparkles size={13} strokeWidth={2} />
              For venue &amp; event businesses
            </span>
            <h1 className="font-display text-3xl font-bold leading-tight text-white">
              Everything your venue needs, in one sign in.
            </h1>
            <ul className="mt-10 space-y-5">
              {POINTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3.5">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center">
                    <Icon size={15} strokeWidth={1.9} className="text-gold-400" />
                  </span>
                  <span className="text-sm text-white/80 leading-relaxed pt-1.5">{text}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <p className="relative text-xs text-white/45">
            © {new Date().getFullYear()}{" "}
            
            <a  href="https://campussafar.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/70 transition-colors"
            >
              Campussafar Technologies Private Limited®
            </a>
            . In2Fest™ is a trademark.
          </p>
        </div>

        {/* Form panel */}
        <div className="flex items-center justify-center px-6 py-12 sm:px-10 sm:py-14 bg-white">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full max-w-sm"
          >
            <Link to="/" className="lg:hidden mb-8 flex items-center gap-2 w-fit">
              <img src={logo} alt="In2Fest" className="h-7 w-auto" />
            </Link>

            <h2 className="font-display text-[26px] sm:text-2xl font-bold text-navy-900 tracking-tight">
              Sign in to your venue
            </h2>
            <p className="text-sm text-navy-400 mt-2 mb-9">
              Manage bookings, your site and inquiries in one place.
            </p>

            <GoogleLoginButton />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}