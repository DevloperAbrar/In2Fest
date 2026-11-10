import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, BookmarkCheck, X } from "lucide-react";
import { usePublicAuth } from "../../context/PublicAuthContext.jsx";
import publicAuthApi from "../../services/publicAuthApi.js";
import GoogleSignInButton from "./GoogleSignInButton.jsx";

const STYLES = {
  glass: (saved) =>
    `w-10 h-10 rounded-full shadow-lg backdrop-blur-md hover:scale-105 ${
      saved ? "bg-accent-500 text-white" : "bg-white/90 text-navy-800 hover:bg-white"
    }`,
  outline: (saved) =>
    `flex-1 gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium ${
      saved
        ? "border-accent-300 bg-accent-50 text-accent-700 hover:bg-accent-100"
        : "border-gray-200 text-gray-600 hover:bg-gray-50"
    }`,
};

export default function SaveButton({ venue, variant = "outline", className = "" }) {
  const { user, login } = usePublicAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Check save status whenever the visitor logs in
  useEffect(() => {
    if (!user || !venue?.id) return;
    const token = localStorage.getItem("visitorAccessToken");
    publicAuthApi
      .get(`/saved/${venue.id}/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setSaved(data.saved))
      .catch(() => {});
  }, [user, venue?.id]);

  const doToggle = useCallback(async () => {
    const token = localStorage.getItem("visitorAccessToken");
    setSaving(true);
    try {
      const { data } = await publicAuthApi.post(
        `/saved/${venue.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSaved(data.saved);
    } catch (err) {
      console.error("Save toggle failed", err);
    } finally {
      setSaving(false);
    }
  }, [venue?.id]);

  const handleClick = () => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    doToggle();
  };

  const handleGoogleSuccess = async (credential) => {
    try {
      await login(credential);
      setShowLogin(false);
      setTimeout(() => doToggle(), 300);
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  const Icon = saved ? BookmarkCheck : Bookmark;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={saving}
        aria-label={saved ? "Remove from saved" : "Save this business"}
        className={`inline-flex items-center justify-center transition-all ${STYLES[variant](saved)} ${
          saving ? "opacity-60 cursor-not-allowed" : ""
        } ${className}`}
      >
        <Icon size={16} />
        {variant === "outline" && <span>{saved ? "Saved" : "Save"}</span>}
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showLogin && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[90] bg-navy-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
                onClick={() => setShowLogin(false)}
              >
                <motion.div
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 40, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl"
                >
                  <button
                    type="button"
                    onClick={() => setShowLogin(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                  <div className="w-12 h-12 rounded-2xl bg-accent-50 text-accent-600 flex items-center justify-center mb-4">
                    <Bookmark size={22} />
                  </div>
                  <p className="font-display font-bold text-navy-900 text-lg">Sign in to save this business</p>
                  <p className="text-sm text-gray-500 mt-1 mb-5">
                    Saved businesses appear in your profile, so you can find them again in one tap.
                  </p>
                  <GoogleSignInButton onSuccess={handleGoogleSuccess} text="continue_with" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}