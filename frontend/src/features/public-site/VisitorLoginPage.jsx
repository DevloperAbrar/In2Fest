// Opened as a popup from a restaurant website. Google sign-in happens HERE (on the main app origin,
// which is the only origin registered with Google), then the session is handed back to the website.
import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { exchangeGoogleCredential, isAllowedSiteOrigin } from "../../lib/visitorAuth";

export default function VisitorLoginPage() {
  const target = new URLSearchParams(window.location.search).get("origin") || "";
  const allowed = isAllowedSiteOrigin(target) && Boolean(window.opener);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center text-sm text-gray-600">
        This sign-in link is not valid. Close this window and try again from the restaurant's website.
      </div>
    );
  }

  const done = async (credential) => {
    setBusy(true);
    setErr("");
    try {
      const { accessToken, user } = await exchangeGoogleCredential(credential);
      window.opener.postMessage({ type: "in2fest-visitor-login", accessToken, user }, target);
      window.close();
    } catch {
      setErr("Google sign-in failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Sign in to order</h1>
        <p className="text-sm text-gray-500">Continue with Google to place orders and track them live.</p>
        <div className="flex justify-center">
          {busy ? (
            <p className="text-sm text-gray-500">Signing you in…</p>
          ) : (
            <GoogleLogin
              text="continue_with"
              shape="pill"
              onSuccess={(res) => done(res.credential)}
              onError={() => setErr("Google sign-in was cancelled or blocked.")}
            />
          )}
        </div>
        {err && <p className="text-xs text-red-500">{err}</p>}
      </div>
    </div>
  );
}