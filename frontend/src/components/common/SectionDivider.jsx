import React from "react";

const PATHS = {
  wave: "M0,64 C240,120 480,0 720,32 C960,64 1200,112 1440,64 L1440,120 L0,120 Z",
  curve: "M0,0 C480,120 960,120 1440,0 L1440,120 L0,120 Z",
  tilt: "M0,0 L1440,80 L1440,120 L0,120 Z",
  tiltReverse: "M0,80 L1440,0 L1440,120 L0,120 Z"
};

// Renders a shape-divider strip at the top or bottom of a section.
// `color` should match the background color of the section this divider
// sits INSIDE (i.e. the section it visually "cuts into").
export default function SectionDivider({ variant = "wave", position = "bottom", color = "#ffffff", className = "" }) {
  const flipClass = position === "top" ? "rotate-180" : "";
  return (
    <div className={`w-full overflow-hidden leading-none pointer-events-none select-none ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className={`w-full h-10 md:h-20 block ${flipClass}`}
      >
        <path d={PATHS[variant] || PATHS.wave} fill={color} />
      </svg>
    </div>
  );
}