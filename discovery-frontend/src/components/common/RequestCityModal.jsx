import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, MapPin, CheckCircle2 } from "lucide-react";
import api from "../../lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CONTACT_ERROR = "Enter a valid email or 10-digit mobile number.";

// True only for a real Indian mobile: 10 digits starting 6-9,
// with an optional +91 / 91 / 0 prefix.
function isValidMobile(value) {
  let digits = value.replace(/[\s\-().]/g, "");
  if (!/^\+?\d+$/.test(digits)) return false;

  digits = digits.replace(/^\+/, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);

  return /^[6-9]\d{9}$/.test(digits);
}

function isValidContact(value) {
  const v = value.trim();
  return EMAIL_RE.test(v) || isValidMobile(v);
}

// While the user is typing a phone number (digits / + / spaces / dashes only),
// stop accepting more than 12 digits (91 + 10-digit mobile).
function limitPhoneDigits(value) {
  if (!/^[+\d\s\-()]*$/.test(value)) return value; // looks like an email, leave it
  let count = 0;
  let out = "";
  for (const ch of value) {
    if (/\d/.test(ch)) {
      if (count >= 12) continue;
      count += 1;
    }
    out += ch;
  }
  return out;
}

export default function RequestCityModal({ open, onClose, defaultCity = "" }) {
  const [city, setCity]         = useState(defaultCity);
  const [contact, setContact]   = useState("");
  const [status, setStatus]     = useState("idle"); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState("");

  // Reset the form every time the modal opens
  useEffect(() => {
    if (open) {
      setCity(defaultCity);
      setContact("");
      setStatus("idle");
      setErrorMsg("");
    }
  }, [open, defaultCity]);

  // While open: close on Escape and stop the page behind from scrolling
  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const handleContactChange = (e) => {
    setContact(limitPhoneDigits(e.target.value));
    if (status === "error") setStatus("idle");
  };

  const submit = async () => {
    if (status === "loading") return;
    if (!city.trim() || !contact.trim()) return;

    if (!isValidContact(contact)) {
      setErrorMsg(CONTACT_ERROR);
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg("");
    try {
      await api.post("/city-requests", { city: city.trim(), contact: contact.trim() });
      setStatus("success");
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Something went wrong - please try again.");
      setStatus("error");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") submit();
  };

  // Rendered through a portal into <body> so the hero section's stacking
  // contexts (transforms / animations on the chips and search bar) can never
  // paint on top of the modal.
  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(26,32,53,0.55)", zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative max-h-[90vh] overflow-y-auto"
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
              onKeyDown={handleKeyDown}
              placeholder="e.g. Chennai"
              maxLength={100}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-primary-400 transition-colors mb-4"
            />

            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Phone</label>
            <input
              value={contact}
              onChange={handleContactChange}
              onKeyDown={handleKeyDown}
              placeholder="10-digit mobile or email"
              maxLength={150}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-primary-400 transition-colors mb-5"
            />

            {status === "error" && (
              <p className="text-xs text-red-500 mb-3">{errorMsg}</p>
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
    </div>,
    document.body
  );
}