import React, { useEffect } from "react";
import { PlayCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { setDemoMode } from "../../lib/demoMode";

export default function DemoBanner() {
  const { user } = useAuth();
  const isDemo = !!user?.isDemo;

  useEffect(() => {
    setDemoMode(isDemo);
    return () => setDemoMode(false);
  }, [isDemo]);

  if (!isDemo) return null;

  const till = user?.demoExpiresAt
    ? new Date(user.demoExpiresAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  return (
    <div className="bg-primary-600 text-white text-sm px-4 py-2 flex items-center justify-center gap-2 flex-wrap text-center">
      <PlayCircle size={15} />
      <span className="font-medium">Demo account with sample data</span>
      <span className="opacity-90">- WhatsApp sending, uploads and payments are switched off{till ? `. Valid till ${till}` : ""}.</span>
    </div>
  );
}