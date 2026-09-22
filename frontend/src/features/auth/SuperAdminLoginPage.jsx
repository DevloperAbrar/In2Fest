import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import AdminLoginForm from "./AdminLoginForm.jsx";
import logo from "../../assets/logo.png";

export default function SuperAdminLoginPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center bg-navy-900 font-sans px-4 py-10 overflow-hidden">
      {/* Ambient background - deliberately plain, no marketing content on this page */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 w-[26rem] h-[26rem] bg-navy-500/30 rounded-full blur-[120px]" />
        <div className="absolute -bottom-32 -right-24 w-[26rem] h-[26rem] bg-primary-600/20 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-white/10 px-8 py-10"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-navy-900 flex items-center justify-center mb-4">
            <ShieldCheck size={22} className="text-gold-400" strokeWidth={1.8} />
          </div>
          <img src={logo} alt="In2Fest" className="h-6 w-auto mb-3 opacity-70" />
          <h1 className="font-display text-xl font-bold text-navy-900">Restricted access</h1>
          <p className="text-sm text-navy-400 mt-1.5">
            Authorized In2Fest personnel only. This attempt is logged.
          </p>
        </div>

        <AdminLoginForm />
      </motion.div>
    </div>
  );
}