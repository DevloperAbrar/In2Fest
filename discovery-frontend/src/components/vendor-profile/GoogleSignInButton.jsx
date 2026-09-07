import React, { useEffect, useRef } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCRIPT_ID = "google-identity-services";

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Renders Google's own "Sign in with Google" button. On success it calls
 * onSuccess(credential) with the raw Google ID token (JWT)  - verification
 * happens server-side, no OTP/SMS cost involved.
 */
export default function GoogleSignInButton({ onSuccess, onError, text = "continue_with" }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    if (!GOOGLE_CLIENT_ID) {
      onError?.("Google sign-in is not configured");
      return;
    }

    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => onSuccess(response.credential)
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          width: 320,
          text
        });
      })
      .catch(() => {
        if (!cancelled) onError?.("Could not load Google sign-in, check your connection");
      });

    return () => { cancelled = true; };
  }, [onSuccess, onError, text]);

  return <div ref={buttonRef} className="flex justify-center" />;
}