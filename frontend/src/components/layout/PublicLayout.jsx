import React, { useState, useEffect } from "react";
import { Moon, Sun, Menu, X, Phone } from "lucide-react";

export default function PublicLayout({ venueName, venue, children }) {
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const navLinks = [
    { label: "Home", href: "#home" },
    { label: "About", href: "#about" },
    { label: "Services", href: "#services" },
    { label: "Gallery", href: "#gallery" },
    { label: "Availability", href: "#availability" },
    { label: "Reviews", href: "#testimonials" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors duration-300">

        {/* Navbar */}
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 dark:bg-stone-950/95 backdrop-blur shadow-md shadow-black/5"
            : "bg-transparent"
        }`}>
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <span className="font-bold text-lg text-stone-900 dark:text-white">
              {venueName}
            </span>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((l) => (
                
              <a    key={l.href}
                  href={l.href}
                  className={`text-sm font-medium transition-colors hover:text-[var(--venue-accent)] ${
                    scrolled ? "text-stone-700 dark:text-stone-300" : "text-white"
                  }`}
                  style={{ "--venue-accent": venue?.theme_color || "#7c3aed" }}
                >
                  {l.label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {/* Phone */}
              {venue?.phone && (
                
                <a  href={`tel:${venue.phone}`}
                  className={`hidden md:flex items-center gap-1 text-sm font-medium transition-colors ${
                    scrolled ? "text-stone-700 dark:text-stone-300" : "text-white"
                  }`}
                >
                  <Phone size={14} /> {venue.phone}
                </a>
              )}

              {/* Check Availability button */}
              
             <a   href="#availability"
                className="hidden md:inline-block px-4 py-2 rounded-full text-sm font-semibold text-white transition-transform hover:scale-105"
                style={{ backgroundColor: venue?.theme_color || "#7c3aed" }}
              >
                Check Availability
              </a>

              {/* Dark mode toggle */}
              <button
                onClick={() => setDark(!dark)}
                aria-label="Toggle dark mode"
                className={`p-2 rounded-full transition-colors ${
                  scrolled
                    ? "text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                    : "text-white hover:bg-white/20"
                }`}
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`md:hidden p-2 rounded-full ${
                  scrolled ? "text-stone-700 dark:text-stone-300" : "text-white"
                }`}
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {menuOpen && (
            <div className="md:hidden bg-white dark:bg-stone-950 border-t border-stone-100 dark:border-stone-800 px-6 py-4 space-y-3">
              {navLinks.map((l) => (
                
                <a  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="block text-sm font-medium text-stone-700 dark:text-stone-300 hover:text-[var(--venue-accent)]"
                  style={{ "--venue-accent": venue?.theme_color || "#7c3aed" }}
                >
                  {l.label}
                </a>
              ))}
              
              <a  href="#inquiry"
                onClick={() => setMenuOpen(false)}
                className="block text-center px-4 py-2 rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: venue?.theme_color || "#7c3aed" }}
              >
                Enquire Now
              </a>
            </div>
          )}
        </nav>

        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="bg-stone-950 dark:bg-black text-stone-400 py-8 text-center text-sm">
          <p className="font-medium text-white mb-1">{venueName}</p>
          <p>© {new Date().getFullYear()} {venueName}. All rights reserved.</p>
          <p className="mt-1 text-xs">Powered by <span className="text-purple-400">In2Fest</span></p>
        </footer>
      </div>
    </div>
  );
}