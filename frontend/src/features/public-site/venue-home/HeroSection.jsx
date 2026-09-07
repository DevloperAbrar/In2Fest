import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function HeroSection({ venue }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 60); return () => clearTimeout(t); }, []);

  const theme = venue.theme_color || "#7c3aed";

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center text-center text-white overflow-hidden"
      style={{ backgroundImage: `url(${venue.hero_image_url || "/placeholder-venue.jpg"})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      {/* Dark overlay  - warm charcoal instead of flat black */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-950/75 via-stone-950/55 to-stone-950/85" />

      {/* Animated color accent blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: theme, animation: "float1 8s ease-in-out infinite" }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full opacity-15 blur-3xl"
          style={{ backgroundColor: theme, animation: "float2 10s ease-in-out infinite" }}
        />
      </div>

      <div
        className="relative z-10 px-6 max-w-4xl mx-auto"
        style={{
          opacity: loaded ? 1 : 0,
          transform: loaded ? "translateY(0)" : "translateY(32px)",
          transition: "opacity 0.9s ease, transform 0.9s ease",
        }}
      >
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-widest mb-8 border border-white/20 backdrop-blur-sm"
          style={{ backgroundColor: `${theme}33` }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme }} />
          {venue.business_category || "Welcome"}
        </div>

        <h1
          className="text-5xl md:text-7xl font-extrabold leading-tight mb-6"
          style={{ textShadow: "0 4px 32px rgba(0,0,0,0.4)", letterSpacing: "-0.02em" }}
        >
          {venue.hero_heading || venue.hall_name}
        </h1>

        {venue.hero_subheading && (
          <p
            className="text-lg md:text-2xl text-stone-200 mb-12 max-w-2xl mx-auto leading-relaxed"
            style={{ opacity: loaded ? 1 : 0, transition: "opacity 1.1s ease 0.2s" }}
          >
            {venue.hero_subheading}
          </p>
        )}

        <div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          style={{ opacity: loaded ? 1 : 0, transition: "opacity 1.2s ease 0.4s" }}
        >
          
          <a  href="#inquiry"
            className="px-10 py-4 rounded-full font-bold text-white text-base shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-xl"
            style={{ backgroundColor: theme, boxShadow: `0 8px 32px ${theme}66` }}
          >
            {venue.hero_button_text || "Book Now"}
          </a>
          
         <a   href="#about"
            className="px-10 py-4 rounded-full font-bold text-white text-base border-2 border-white/40 backdrop-blur-sm hover:bg-white/10 transition-all duration-300"
          >
            Learn More
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-60">
        <span className="text-white text-xs tracking-widest uppercase">Scroll</span>
        <ChevronDown size={24} className="text-white animate-bounce" />
      </div>

      {/* Bottom wave  - matches the About section's tone below it */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full h-16 md:h-20 block">
          <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" className="fill-white dark:fill-stone-950" />
        </svg>
      </div>

      <style>{`
        @keyframes float1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(40px,30px)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-30px,-20px)} }
      `}</style>
    </section>
  );
}