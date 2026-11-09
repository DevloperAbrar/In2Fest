import React, { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useInView, animate } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

// Scroll-reveal wrapper. Uses only opacity + transform, and is skipped
// entirely when the visitor has "reduce motion" turned on.
export function Reveal({ children, delay = 0, y = 24, className = "", as = "div" }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;
  if (reduce) return <Tag className={className}>{children}</Tag>;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </Tag>
  );
}

// Count-up number that starts when it scrolls into view.
export function CountUp({ to, suffix = "" }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [val, setVal] = useState(reduce ? to : 0);

  useEffect(() => {
    if (reduce) { setVal(to); return undefined; }
    if (!inView) return undefined;
    const controls = animate(0, to, {
      duration: 1.4,
      ease: "easeOut",
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, reduce, to]);

  return <span ref={ref}>{val.toLocaleString("en-IN")}{suffix}</span>;
}

export function SectionHead({ eyebrow, title, sub, center = false }) {
  return (
    <Reveal className={center ? "text-center max-w-2xl mx-auto" : "max-w-2xl"}>
      {eyebrow && (
        <p className="text-xs font-bold tracking-[0.18em] uppercase text-gold-600 mb-3">{eyebrow}</p>
      )}
      <h2
        className="font-display font-extrabold text-navy-700"
        style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)", letterSpacing: "-0.02em", lineHeight: 1.1 }}
      >
        {title}
      </h2>
      {sub && <p className="mt-4 text-base md:text-lg text-navy-400 leading-relaxed">{sub}</p>}
    </Reveal>
  );
}