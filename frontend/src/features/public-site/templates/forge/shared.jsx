import React, { useEffect, useState } from "react";
import { useScrollReveal } from "../../../../hooks/useScrollReveal";

export const INK = "#0a0a0a";
export const FONT_HEAD = "'Barlow Condensed', 'Arial Narrow', sans-serif";
export const FONT_BODY = "'Inter', sans-serif";

export function ForgeStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=Inter:wght@300;400;500;600&display=swap');
      @keyframes forgeRise { from { opacity: 0; transform: translateY(46px); } to { opacity: 1; transform: none; } }
      @keyframes forgeMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      @keyframes forgePulse { 0%,100% { box-shadow: 0 0 0 0 currentColor; opacity: 1; } 50% { box-shadow: 0 0 0 8px transparent; opacity: .55; } }
      @keyframes forgeFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      @media (prefers-reduced-motion: reduce) {
        .forge-anim { animation: none !important; opacity: 1 !important; transform: none !important; }
        .forge-reveal { transition: none !important; }
      }
    `}</style>
  );
}

// Fades and slides an element in once it scrolls into view.
export function Reveal({ children, delay = 0, className = "", from = "up", id }) {
  const [ref, visible] = useScrollReveal();
  const hidden = from === "left" ? "translateX(-60px)" : from === "right" ? "translateX(60px)" : "translateY(48px)";
  return (
    <div
      id={id}
      ref={ref}
      className={`forge-reveal ${className}`}
      style={{
        transition: "opacity 0.9s cubic-bezier(.16,1,.3,1), transform 0.9s cubic-bezier(.16,1,.3,1)",
        transitionDelay: `${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : hidden,
        scrollMarginTop: "100px"
      }}
    >
      {children}
    </div>
  );
}

// "500+" -> counts up from 0 to 500 when it scrolls into view. Non-numeric text is shown as it is.
export function AnimatedValue({ value, className = "", style }) {
  const [ref, visible] = useScrollReveal();
  const text = String(value ?? "");
  const m = text.match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  const target = m ? parseFloat(m[2].replace(/,/g, "")) : 0;
  const decimals = m && m[2].includes(".") ? m[2].split(".")[1].length : 0;
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!visible || !m) return undefined;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / 1400);
      setN(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  if (!m) return <span ref={ref} className={className} style={style}>{text}</span>;
  const shown = decimals ? n.toFixed(decimals) : Math.round(n).toLocaleString("en-IN");
  return <span ref={ref} className={className} style={style}>{m[1]}{shown}{m[3]}</span>;
}