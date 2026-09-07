import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarCheck2, Globe2, MessageCircle } from "lucide-react";
import GoogleLoginButton from "./GoogleLoginButton.jsx";
import AdminLoginForm from "./AdminLoginForm.jsx";
import { showError } from "../../components/common/Toast";
import logo from "../../assets/logo.png";
import heroLoginImage from "../../assets/hero-login.png";

const POINTS = [
  { icon: Globe2, text: "Your branded booking site, live the same day" },
  { icon: CalendarCheck2, text: "One shared calendar - nothing gets double-booked" },
  { icon: MessageCircle, text: "WhatsApp alerts the moment an inquiry comes in" },
];

export default function LoginPage() {
  const [mode, setMode] = useState("owner"); // "owner" | "admin"
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
    <div className="min-h-screen bg-paper font-sans grid lg:grid-cols-2">
      {/* Brand panel - photo background with a dark scrim so text stays readable */}
      <div
        className="hidden lg:flex flex-col justify-between px-12 py-12 relative bg-cover bg-center"
        style={{ backgroundImage: `url(${heroLoginImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900/85 via-navy-900/75 to-navy-900/95" />

        <Link
          to="/"
          className="relative inline-block bg-white/95 rounded-lg px-3 py-1.5 backdrop-blur-sm shadow-sm w-fit"
        >
          <img src={logo} alt="In2Fest" className="h-6 w-auto" />
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-sm"
        >
          <h1 className="font-display text-3xl font-bold leading-tight text-white">
            Everything your venue needs, in one sign in.
          </h1>
          <ul className="mt-10 space-y-6">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3.5">
                <Icon size={19} strokeWidth={1.75} className="text-gold-400 mt-0.5 shrink-0" />
                <span className="text-sm text-white/80 leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <p className="relative text-xs text-white/45">
          © {new Date().getFullYear()}{" "}
          <a href="https://campussafar.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/70 transition-colors">
            Campussafar Technologies Private Limited®
          </a>
          . In2Fest™ is a trademark.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <Link to="/" className="lg:hidden mb-10 block w-fit">
            <img src={logo} alt="In2Fest" className="h-7 w-auto" />
          </Link>

          <h2 className="font-display text-2xl font-bold text-navy-900">
            {mode === "owner" ? "Sign in to your venue" : "Super admin access"}
          </h2>
          <p className="text-sm text-navy-400 mt-2 mb-8">
            {mode === "owner"
              ? "Manage bookings, your site and inquiries in one place."
              : "Restricted access for the In2Fest team."}
          </p>

          {mode === "owner" ? <GoogleLoginButton /> : <AdminLoginForm />}

          <button
            onClick={() => setMode(mode === "owner" ? "admin" : "owner")}
            className="w-full text-center text-xs text-navy-400 hover:text-navy-700 transition-colors mt-8"
          >
            {mode === "owner" ? "Super admin login" : "Back to venue owner sign in"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}