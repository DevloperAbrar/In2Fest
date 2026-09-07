import React from "react";
import { Loader2 } from "lucide-react";

export default function Loader({ fullScreen = false, size = 24 }) {
  const spinner = <Loader2 className="animate-spin text-primary-600" size={size} />;

  if (fullScreen) {
    return <div className="min-h-screen flex items-center justify-center">{spinner}</div>;
  }
  return <div className="flex items-center justify-center py-8">{spinner}</div>;
}