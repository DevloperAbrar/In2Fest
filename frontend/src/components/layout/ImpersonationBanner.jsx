import React from "react";
import { Eye, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function ImpersonationBanner() {
  const { isImpersonating, user, exitImpersonation } = useAuth();

  if (!isImpersonating) return null;

  return (
    <div className="bg-amber-400 text-amber-950 text-sm px-4 py-2 flex items-center justify-center gap-3 flex-wrap">
      <span className="flex items-center gap-1.5 font-medium">
        <Eye size={15} /> Admin preview {user?.name ? `- viewing as ${user.name}` : ""}
      </span>
      <button
        onClick={exitImpersonation}
        className="flex items-center gap-1 bg-amber-950/10 hover:bg-amber-950/20 rounded-full px-3 py-1 font-medium transition-colors"
      >
        <X size={13} /> Exit preview
      </button>
    </div>
  );
}