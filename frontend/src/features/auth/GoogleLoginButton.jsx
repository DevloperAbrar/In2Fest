import React, { useEffect } from "react";
import { authService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function GoogleLoginButton() {
  const { setTokenFromGoogleCallback } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (event) => {
      // Only accept messages from our own backend relay page origin
      const backendOrigin = import.meta.env.VITE_API_URL
        ? new URL(import.meta.env.VITE_API_URL).origin
        : window.location.origin;

      if (event.origin !== backendOrigin) return;
      if (!event.data || event.data.type !== "GOOGLE_AUTH_SUCCESS") return;

      setTokenFromGoogleCallback(event.data.token).then(() => navigate("/dashboard"));
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [setTokenFromGoogleCallback, navigate]);

  const handleLogin = () => {
    const url = authService.getGoogleLoginUrl();
    const width = 500, height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    window.open(url, "google-oauth", `width=${width},height=${height},left=${left},top=${top}`);
  };

  return (
    <button
      onClick={handleLogin}
      className="w-full flex items-center justify-center gap-3 border border-navy-900/15 rounded-full py-3 font-medium text-sm text-navy-900 hover:border-navy-900/30 hover:bg-navy-900/[0.02] transition-colors"
    >
      <img src="https://www.google.com/favicon.ico" alt="" className="w-4 h-4" />
      Continue with Google
    </button>
  );
}