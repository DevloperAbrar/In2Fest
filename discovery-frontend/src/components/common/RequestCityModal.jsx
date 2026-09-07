import React, { useState, useEffect } from "react";
import { X, MapPin, CheckCircle2 } from "lucide-react";
import api from "../../lib/api";

export default function RequestCityModal({ open, onClose, defaultCity = "" }) {
  const [city, setCity]       = useState(defaultCity);
  const [contact, setContact] = useState("");
  const [status, setStatus]   = useState("idle"); // idle | loading | success | error

  useEffect(() => {
    if (open) {
      setCity(defaultCity);
      setContact("");
      setStatus("idle");
    }
  }, [open, defaultCity]);

  if (!open) return null;

  const submit = async () => {
    if (!city.trim() || !contact.trim()) return;
    setStatus("loading");
    try {
      await api.post("/city-requests", { city: city.trim(), contact: contact.trim() });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(26,32,53,0.55)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
        >
          <X size={16} />
        </button>

        {status === "success" ? (
          <div className="text-center py-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "#16a34a15" }}
            >
              <CheckCircle2 size={24} style={{ color: "#16a34a" }} />
            </div>
            <h3 className="font-display font-bold text-navy-900 text-base mb-1.5">
              Thanks, noted!
            </h3>
            <p className="text-sm text-gray-500">
              We'll notify you the moment we launch in {city}.
            </p>
          </div>
        ) : (
          <>
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
              style={{ background: "#e8192c12" }}
            >
              <MapPin size={20} style={{ color: "#e8192c" }} />
            </div>
            <h3 className="font-display font-bold text-navy-900 text-base mb-1.5">
              We're not live there yet
            </h3>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              Tell us your city and we'll notify you the moment we launch.
            </p>

            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Your city</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Chennai"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-primary-400 transition-colors mb-4"
            />

            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Phone or email</label>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="So we can notify you"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-primary-400 transition-colors mb-5"
            />

            {status === "error" && (
              <p className="text-xs text-red-500 mb-3">Something went wrong  - please try again.</p>
            )}

            <button
              onClick={submit}
              disabled={status === "loading" || !city.trim() || !contact.trim()}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#e8192c,#f5a623)" }}
            >
              {status === "loading" ? "Submitting…" : "Notify Me"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}