import React from "react";
import { authService } from "../../services/authService";

export default function GoogleLoginButton() {
  const handleLogin = () => {
    const url = authService.getGoogleLoginUrl();
    const width = 500, height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    window.open(
      url,
      "google-oauth",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );
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