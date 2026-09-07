import React, { useEffect, useState, useRef } from "react";

export default function HeroSection({ venue }) {
  const [loaded, setLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const theme = venue.theme_color || "#a855f7";

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 80);
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener("scroll", onScroll); };
  }, []);

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}
    >
      <div
        className="absolute inset-0 will-change-transform"
        style={{
          backgroundImage: `url(${venue.hero_image_url || "/placeholder-venue.jpg"})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transform: `translateY(${scrollY * 0.35}px)`,
          filter: "brightness(0.38)",
        }}
      />

      <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, rgba(5,0,15,0.92) 0%, rgba(15,5,30,0.75) 50%, rgba(5,0,15,0.88) 100%)` }} />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.12] blur-[120px]"
          style={{ backgroundColor: theme, animation: "auroraDrift1 12s ease-in-out infinite" }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.08] blur-[100px]"
          style={{ backgroundColor: theme, animation: "auroraDrift2 16s ease-in-out infinite" }} />
      </div>

      <div
        className="relative z-10 text-center px-6 max-w-5xl mx-auto"
        style={{
          opacity: loaded ? 1 : 0,
          transform: loaded ? "none" : "translateY(40px)",
          transition: "opacity 1.1s cubic-bezier(0.16,1,0.3,1), transform 1.1s cubic-bezier(0.16,1,0.3,1)"
        }}
      >
        <div className="inline-flex items-center gap-3 mb-10" style={{ opacity: loaded ? 1 : 0, transition: "opacity 1s ease 0.1s" }}>
          <div className="h-px w-12 opacity-60" style={{ backgroundColor: theme }} />
          <span className="text-xs tracking-[0.35em] uppercase font-light text-white/70" style={{ fontFamily: "'Inter', sans-serif" }}>
            {venue.business_category || "Venue"}
          </span>
          <div className="h-px w-12 opacity-60" style={{ backgroundColor: theme }} />
        </div>

        <h1
          className="text-6xl md:text-8xl lg:text-9xl font-bold text-white leading-[0.9] tracking-tight mb-8"
          style={{ textShadow: "0 0 80px rgba(255,255,255,0.1)", letterSpacing: "-0.03em", opacity: loaded ? 1 : 0, transition: "opacity 1.1s ease 0.15s" }}
        >
          {venue.hero_heading || venue.hall_name}
        </h1>

        {venue.hero_subheading && (
          <p
            className="text-lg md:text-xl text-white/60 mb-14 max-w-xl mx-auto leading-relaxed font-light"
            style={{ fontFamily: "'Inter', sans-serif", opacity: loaded ? 1 : 0, transition: "opacity 1.1s ease 0.3s" }}
          >
            {venue.hero_subheading}
          </p>
        )}

        <div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          style={{ opacity: loaded ? 1 : 0, transition: "opacity 1.1s ease 0.45s" }}
        >
          
          <a  href="#inquiry"
            className="group relative px-10 py-4 rounded-full text-sm font-semibold tracking-wide overflow-hidden transition-all duration-500 hover:scale-105"
            style={{ fontFamily: "'Inter', sans-serif", backgroundColor: theme, color: "#fff", boxShadow: `0 0 40px ${theme}55` }}
          >
            {venue.hero_button_text || "Book Your Date"}
          </a>
          
          <a  href="#about"
            className="px-10 py-4 rounded-full text-sm font-semibold tracking-wide border transition-all duration-300 hover:bg-white/10"
            style={{ fontFamily: "'Inter', sans-serif", borderColor: "rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.85)" }}
          >
            Explore Venue
          </a>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent, rgb(5,0,15))" }}
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap');
        @keyframes auroraDrift1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(60px,40px) scale(1.1)} 66%{transform:translate(-30px,60px) scale(0.95)} }
        @keyframes auroraDrift2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-50px,-40px) scale(1.15)} }
      `}</style>
    </section>
  );
}