import React, { useState, useEffect, useCallback } from "react";
import { Phone, MessageCircle, Send, Bookmark, BookmarkCheck, X } from "lucide-react";
import { usePublicAuth } from "../../context/PublicAuthContext.jsx";
import publicAuthApi from "../../services/publicAuthApi.js";
import GoogleSignInButton from "./GoogleSignInButton.jsx";

export default function ContactButtons({ venue, onSendInquiry }) {
  const { user, login } = usePublicAuth();
  const [saved, setSaved]         = useState(false);
  const [saving, setSaving]       = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Check save status whenever user logs in
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

  async function handleSaveClick() {
    if (!user) { setShowLogin(true); return; }
    doToggle();
  }

  async function handleGoogleSuccess(credential) {
    try {
      await login(credential);
      setShowLogin(false);
      setTimeout(() => doToggle(), 300);
    } catch (err) {
      console.error("Login failed", err);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2.5">
        
        <a  href={`tel:${venue.phone}`}
          className="flex items-center gap-2 bg-navy-50 text-navy-700 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-navy-100 transition-colors"
        >
          <Phone size={15} /> Call Now
        </a>

        
        <a  href={`https://wa.me/${(venue.whatsapp_number || venue.phone || "").replace(/\D/g, "")}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 bg-green-50 text-green-700 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-green-100 transition-colors"
        >
          <MessageCircle size={15} /> WhatsApp
        </a>

        <button
          onClick={onSendInquiry}
          className="flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm hover:opacity-90 transition-opacity bg-gradient-to-r from-accent-500 to-accent-600"
        >
          <Send size={15} /> Send Inquiry
        </button>

        <button
          onClick={handleSaveClick}
          disabled={saving}
          className={[
            "flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border transition-colors",
            saved
              ? "border-accent-300 bg-accent-50 text-accent-700 hover:bg-accent-100"
              : "border-gray-200 text-gray-600 hover:bg-gray-50",
            saving ? "opacity-60 cursor-not-allowed" : ""
          ].join(" ")}
        >
          {saved
            ? <><BookmarkCheck size={15} className="text-accent-600" /> Saved</>
            : <><Bookmark size={15} /> Save</>
          }
        </button>
      </div>

      {/* Google sign-in prompt shown when unauthenticated user clicks Save */}
      {showLogin && (
        <div className="relative bg-navy-50 border border-navy-100 rounded-2xl p-4">
          <button
            onClick={() => setShowLogin(false)}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          >
            <X size={15} />
          </button>
          <p className="text-sm font-semibold text-navy-800 mb-1">Sign in to save this vendor</p>
          <p className="text-xs text-navy-500 mb-3">
            Your saved vendors appear in your profile for easy access later.
          </p>
          <GoogleSignInButton onSuccess={handleGoogleSuccess} text="continue_with" />
        </div>
      )}
    </div>
  );
}