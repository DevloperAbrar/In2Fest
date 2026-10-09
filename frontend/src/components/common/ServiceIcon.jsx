import React from "react";
import { resolveServiceIcon } from "../../lib/serviceIcons";

// Renders a service icon as crisp SVG. Works with new keys AND legacy emoji values.
export default function ServiceIcon({ name, size = 20, strokeWidth = 1.75, className = "", style, fallback = null }) {
  const entry = resolveServiceIcon(name);
  if (!entry) return fallback;
  const { Icon } = entry;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} style={style} aria-hidden="true" />;
}