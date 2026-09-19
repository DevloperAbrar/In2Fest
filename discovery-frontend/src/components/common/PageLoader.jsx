import React, { useEffect, useRef, useState } from "react";

const CATS = [
  "Venues & Celebration Spaces", "Photography & Films", "Décor & Production",
  "Beauty & Styling", "Catering Services", "DJ & Entertainment",
  "Horse & Buggy", "Pandit Services", "Travel & Transport", "Makeup Artists",
];
const SPARK_COLORS = ["#e8192c", "#f5a623", "#1a2035", "#e8192c", "#f5a623"];

class Spark {
  constructor(x, y, color) {
    this.x = x; this.y = y; this.color = color;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.8 + Math.random() * 2.4;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 1.2;
    this.life = 1;
    this.decay = 0.022 + Math.random() * 0.018;
    this.size = 1.8 + Math.random() * 2.2;
    this.trail = [];
  }
  update() {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 5) this.trail.shift();
    this.vx *= 0.97;
    this.vy += 0.06;
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
  }
  draw(ctx) {
    this.trail.forEach((t, i) => {
      const a = (i / this.trail.length) * this.life * 0.4;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.size * 0.5 * (i / this.trail.length), 0, Math.PI * 2);
      ctx.fillStyle = this.color + Math.floor(a * 255).toString(16).padStart(2, "0");
      ctx.fill();
    });
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
    ctx.fillStyle = this.color + Math.floor(this.life * 220).toString(16).padStart(2, "0");
    ctx.fill();
  }
}

export default function PageLoader() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [pillIndex, setPillIndex] = useState(0);
  const [pillKey, setPillKey] = useState(0);
  const [shimmer, setShimmer] = useState(0);

  // category pill rotation
  useEffect(() => {
    const id = setInterval(() => {
      setPillIndex((i) => (i + 1) % CATS.length);
      setPillKey((k) => k + 1);
    }, 950);
    return () => clearInterval(id);
  }, []);

  // progress shimmer
  useEffect(() => {
    let pct = 0;
    const id = setInterval(() => {
      pct += pct < 70 ? Math.random() * 13 : Math.random() * 1.2;
      setShimmer(Math.min(pct, 85));
    }, 175);
    return () => clearInterval(id);
  }, []);

  // firework canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const resize = () => {
      canvas.width = wrap.offsetWidth;
      canvas.height = wrap.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const ctx = canvas.getContext("2d");
    const particles = [];

    const makeBurst = () => {
      const x = canvas.width * (0.18 + Math.random() * 0.64);
      const y = canvas.height * (0.08 + Math.random() * 0.55);
      const color = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];
      const count = 18 + Math.floor(Math.random() * 14);
      for (let i = 0; i < count; i++) particles.push(new Spark(x, y, color));
      setTimeout(makeBurst, 600 + Math.random() * 1200);
    };

    // stagger 5 initial bursts
    for (let i = 0; i < 5; i++) setTimeout(makeBurst, i * 380);

    let raf;
    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].life <= 0) particles.splice(i, 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      role="status"
      aria-live="polite"
      aria-label="Loading In2Fest"
      style={{
        minHeight: "calc(100vh - 5rem)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        fontFamily: "'Inter', system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* progress bar */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "3px", background: "#f2f3f6" }}>
        <div style={{ height: "100%", width: `${shimmer}%`, background: "linear-gradient(90deg,#e8192c,#f5a623)", transition: "width .18s ease-out", borderRadius: "0 2px 2px 0" }} />
      </div>

      {/* background glow */}
      <div aria-hidden="true" style={{ position: "absolute", top: "38%", left: "50%", transform: "translate(-50%,-50%)", width: "320px", height: "320px", borderRadius: "50%", background: "radial-gradient(ellipse,rgba(232,25,44,.07) 0%,transparent 70%)", pointerEvents: "none" }} />

      {/* firework canvas */}
      <canvas ref={canvasRef} aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }} />

      {/* wordmark */}
      <div style={{ position: "relative", zIndex: 2, marginBottom: "22px", fontFamily: "'Sora','Inter',system-ui,sans-serif", fontSize: "36px", fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1, userSelect: "none" }}>
        <span style={{ color: "#1a2035" }}>In</span>
        <span style={{ color: "#e8192c" }}>2</span>
        <span style={{ color: "#1a2035" }}>Fest</span>
      </div>

      {/* rotating category pill */}
      <div style={{ height: "26px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "28px", overflow: "hidden", position: "relative", zIndex: 2 }}>
        <span
          key={pillKey}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: "rgba(232,25,44,.07)", color: "#e8192c",
            fontSize: "11.5px", fontWeight: 600, padding: "4px 14px",
            borderRadius: "999px", border: "1px solid rgba(232,25,44,.18)",
            whiteSpace: "nowrap", animation: "in2pill .32s cubic-bezier(.22,1,.36,1)",
          }}
        >
          <span style={{ fontSize: "9px" }}>●</span>
          {CATS[pillIndex]}
        </span>
      </div>

      {/* three dots */}
      <div style={{ display: "flex", gap: "7px", alignItems: "center", position: "relative", zIndex: 2 }} aria-hidden="true">
        {[
          { bg: "#1a2035", delay: "0s" },
          { bg: "#e8192c", delay: ".18s" },
          { bg: "#f5a623", delay: ".36s" },
        ].map((d, i) => (
          <span key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: d.bg, display: "inline-block", animation: `in2bounce 1.1s ease-in-out ${d.delay} infinite` }} />
        ))}
      </div>

      {/* tagline */}
      <p style={{ marginTop: "22px", fontSize: "11.5px", color: "#9aa0b8", letterSpacing: ".03em", position: "relative", zIndex: 2 }}>
        India's trusted wedding &amp; event platform
      </p>

      <span className="sr-only">Loading, please wait…</span>

      <style>{`
        @keyframes in2pill {
          from { opacity: 0; transform: translateY(7px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes in2bounce {
          0%, 80%, 100% { transform: translateY(0);    opacity: .55; }
          40%            { transform: translateY(-9px); opacity: 1;   }
        }
      `}</style>
    </div>
  );
}