import React from "react";
import { Eye } from "lucide-react";
import api from "../../../services/api";
import { showError } from "../../../components/common/Toast";

export default function ImpersonateButton({ venue }) {
  const handleImpersonate = async () => {
    try {
      // Backend note: implement POST /api/venues/:id/impersonate returning a short-lived
      // owner-scoped token, then open the dashboard in a new tab with that token.
      const { data } = await api.post(`/venues/${venue.id}/impersonate`);
      window.open(`/auth/callback?token=${data.data.accessToken}`, "_blank");
    } catch (err) {
      showError("Impersonation endpoint not available yet");
    }
  };

  return (
    <button
      onClick={handleImpersonate}
      className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 px-3 py-2"
      title="View as this venue owner"
    >
      <Eye size={16} /> Impersonate
    </button>
  );
}