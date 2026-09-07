import React, { useEffect, useState } from "react";

export default function HeroSection({ venue }) {
  const [loaded, setLoaded] = useState(false);
  const theme = venue.theme_color || "#2563eb";

  useEffect(() => { const t = setTimeout(() => setLoaded(true), 60); return () => clearTimeout(t); }, []);

  return (
    <section
      id="home"
      className="relative min-h-screen overflow-hidden flex flex-col"
      style={{ backgroundColor: "#0a0a0a", fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {venue.hero_image_url && (
        <div
          className="absolute inset-0"
          style={{ backgroundImage: `url(${venue.hero_image_url})`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.12) saturate(0.3)" }}
        />
      )}

      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`, backgroundSize: "80px 80px" }}
      />

      <div
        className="absolute top-0 right-0 w-1/3 h-full opacity-[0.07] pointer-events-none"
        style={{ background: `linear-gradient(to bottom left, ${theme}, transparent)` }}
      />

      <div className="relative z-10 flex items-center justify-between px-8 md:px-16 h-20 border-b border-white/[0.06]">
        <span className="font-bold text-white tracking-widest uppercase" style={{ letterSpacing: "0.2em", fontSize: "11px" }}>
          {venue.business_category || "Venue"}
        </span>
        
        <a  href="#inquiry"
          className="px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 hover:scale-[1.04]"
          style={{ backgroundColor: theme, color: "#fff", letterSpacing: "0.1em" }}
        >
          Book Now
        </a>
      </div>

      <div
        className="relative z-10 flex-1 flex flex-col justify-center px-8 md:px-16 py-20 max-w-7xl"
        style={{ opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(50px)", transition: "all 1s cubic-bezier(0.16,1,0.3,1)" }}
      >
        <div className="mb-8 flex items-center gap-4">
          <div className="h-0.5 w-16" style={{ backgroundColor: theme }} />
          <span className="text-xs tracking-[0.4em] uppercase font-medium" style={{ color: theme }}>
            {venue.hall_name}
          </span>
        </div>

        <h1
          className="font-black text-white leading-[0.88] mb-10 tracking-tight"
          style={{ fontSize: "clamp(3rem, 10vw, 9rem)", letterSpacing: "-0.04em", maxWidth: "80%" }}
        >
          {venue.hero_heading || venue.hall_name}
        </h1>

        {venue.hero_subheading && (
          <p className="text-white/40 text-lg max-w-md leading-relaxed mb-12 font-light" style={{ opacity: loaded ? 1 : 0, transition: "opacity 1s ease 0.3s" }}>
            {venue.hero_subheading}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-6" style={{ opacity: loaded ? 1 : 0, transition: "opacity 1s ease 0.45s" }}>
          
          <a  href="#inquiry"
            className="group flex items-center gap-3 px-8 py-4 text-sm font-semibold uppercase tracking-wider transition-all duration-300 hover:gap-5"
            style={{ backgroundColor: theme, color: "#fff", letterSpacing: "0.1em", borderRadius: "4px" }}
          >
            {venue.hero_button_text || "Book Your Date"}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
          <a href="#about" className="text-sm font-medium text-white/40 hover:text-white transition-colors uppercase tracking-widest" style={{ letterSpacing: "0.15em" }}>
            Learn More
          </a>
        </div>
      </div>

      <div className="relative z-10 border-t border-white/[0.06] px-8 md:px-16 h-16 flex items-center justify-between" style={{ opacity: loaded ? 1 : 0, transition: "opacity 1s ease 0.7s" }}>
        {venue.city && <span className="text-xs text-white/30 uppercase tracking-widest">{venue.city}</span>}
        <div className="flex items-center gap-6 ml-auto">
          {["#about", "#gallery", "#contact"].map((href, i) => (
            <a key={i} href={href} className="text-[10px] text-white/25 hover:text-white/60 uppercase tracking-[0.2em] transition-colors">{href.slice(1)}</a>
          ))}
        </div>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');`}</style>
    </section>
  );
}