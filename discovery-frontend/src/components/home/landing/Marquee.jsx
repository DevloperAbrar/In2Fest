import React from "react";
import { motion, useReducedMotion } from "framer-motion";

const WORDS = ["Gyms", "Libraries", "Restaurants", "Shops", "Clinics", "Salons", "Coaching classes", "Event venues"];

export default function Marquee() {
  const reduce = useReducedMotion();
  const row = [...WORDS, ...WORDS];
  const track = (
    <>
      {row.map((w, i) => (
        <span key={i} className="flex items-center gap-8 flex-shrink-0">
          <span className="font-display font-extrabold text-xl md:text-3xl text-white whitespace-nowrap">{w}</span>
          <span className="text-gold-500 text-2xl" aria-hidden="true">✦</span>
        </span>
      ))}
    </>
  );
  return (
    <div className="bg-[#FFF6E8] py-8 overflow-hidden" aria-label="Business types we serve">
      <div className="bg-accent-500 -rotate-1 scale-[1.03] py-4 overflow-hidden">
        {reduce ? (
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 px-4">{track}</div>
        ) : (
          <motion.div
            className="flex gap-8 w-max"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 28, ease: "linear", repeat: Infinity }}
          >
            {track}
            {track}
          </motion.div>
        )}
      </div>
    </div>
  );
}