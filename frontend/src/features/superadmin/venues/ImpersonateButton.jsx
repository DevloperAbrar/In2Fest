import React, { useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { venueService } from "../../../services/venueService";
import { showError } from "../../../components/common/Toast";

export default function ImpersonateButton({ venue }) {
  const [loading, setLoading] = useState(false);

  const handleImpersonate = async () => {
    setLoading(true);
    try {
      const { data } = await venueService.impersonate(venue.id);
      const token = data.data.accessToken;
      // Opened in a new tab, with mode=impersonate, so AuthCallback stores
      // this token in that tab's sessionStorage only  - it never touches
      // the admin's own logged-in session in this tab.
      window.open(`/auth/callback?token=${encodeURIComponent(token)}&mode=impersonate`, "_blank");
    } catch (err) {
      showError(err.response?.data?.message || "Couldn't start impersonation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleImpersonate}
      disabled={loading}
      className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 px-3 py-2 disabled:opacity-50"
      title="View and manage as this venue owner"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />} Impersonate
    </button>
  );
}