import React from "react";
import { motion } from "framer-motion";

const ORBS = [
  { color: "#e8192c", size: 420, top: "8%",  left: "-8%",  duration: 22 },
  { color: "#f5a623", size: 340, top: "38%", left: "88%",  duration: 26 },
  { color: "#1a2035", size: 480, top: "68%", left: "-10%", duration: 30 },
  { color: "#f5a623", size: 260, top: "88%", left: "78%",  duration: 20 },
];

/**
 * Fixed, decorative, pointer-events-none layer of soft blurred brand-colour
 * blobs that drift slowly behind the page content. Sits at z-0 so every
 * section (which should be relative + z-10) renders above it.
 */
export default function FloatingOrbs() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {ORBS.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            top: orb.top,
            left: orb.left,
            background: orb.color,
            opacity: 0.07,
            filter: "blur(90px)",
          }}
          animate={{
            x: [0, 40, -20, 0],
            y: [0, -30, 20, 0],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}