import * as Icons from "lucide-react";

// Backend stores icons as kebab-case lucide names (e.g. "building-2").
// This turns that into the PascalCase export lucide-react actually uses,
// and falls back to a generic icon so a typo'd/unknown icon never crashes.
export default function resolveCategoryIcon(name) {
  if (!name) return Icons.Sparkles;
  const pascal = name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  return Icons[pascal] || Icons.Sparkles;
}