import React, { useState, useEffect, useRef } from "react";
import { Moon, Sun, Menu, X, Phone, ChevronDown } from "lucide-react";
import { DISCOVERY_URL } from "../../lib/constants";
import SocialFooterRow from "./SocialFooterRow.jsx";
import { MAX_INLINE_NAV_LINKS as MAX_INLINE_LINKS } from "../../lib/navItems";

export default function PublicLayout({ venueName, venue, navItems, children }) {
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Close the "More" dropdown when clicking outside it.
  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [moreOpen]);

  // Vendor can hide the availability calendar from the Website Builder.
  // Hide the "Check Availability" button along with it.
  const showAvailability = venue?.show_availability !== false;

  // Menu chosen by the vendor (Website Builder > "Website menu").
  // Falls back to the classic menu if no list is passed in.
  const navLinks = Array.isArray(navItems)
    ? navItems
    : [
        { key: "home", label: "Home", href: "#home" },
        { key: "about", label: "About", href: "#about" },
        { key: "services", label: "Services", href: "#services" },
        { key: "gallery", label: "Gallery", href: "#gallery" },
        ...(showAvailability ? [{ key: "availability", label: "Availability", href: "#availability" }] : []),
        { key: "testimonials", label: "Reviews", href: "#testimonials" },
        { key: "contact", label: "Contact", href: "#contact" },
      ];

  const inlineLinks = navLinks.slice(0, MAX_INLINE_LINKS);
  const overflowLinks = navLinks.slice(MAX_INLINE_LINKS);
  const accent = venue?.theme_color || "#7c3aed";

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors duration-300">

        {/* Navbar */}
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
            ? "bg-white/95 dark:bg-stone-950/95 backdrop-blur shadow-md shadow-black/5"
            : "bg-transparent"
          }`}>
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <span className="font-bold text-lg text-stone-900 dark:text-white">
              {venueName}
            </span>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-6">
              {inlineLinks.map((l) => (
                <a
                  key={l.key || l.href}
                  href={l.href}
                  className={`text-sm font-medium transition-colors hover:text-[var(--venue-accent)] ${scrolled ? "text-stone-700 dark:text-stone-300" : "text-white"
                    }`}
                  style={{ "--venue-accent": accent }}
                >
                  {l.label}
                </a>
              ))}

              {overflowLinks.length > 0 && (
                <div className="relative" ref={moreRef}>
                  <button
                    type="button"
                    onClick={() => setMoreOpen((o) => !o)}
                    aria-expanded={moreOpen}
                    className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-[var(--venue-accent)] ${scrolled ? "text-stone-700 dark:text-stone-300" : "text-white"
                      }`}
                    style={{ "--venue-accent": accent }}
                  >
                    More <ChevronDown size={14} className={`transition-transform ${moreOpen ? "rotate-180" : ""}`} />
                  </button>

                  {moreOpen && (
                    <div className="absolute right-0 mt-3 w-52 rounded-xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 shadow-xl py-2">
                      {overflowLinks.map((l) => (
                        <a
                          key={l.key || l.href}
                          href={l.href}
                          onClick={() => setMoreOpen(false)}
                          className="block px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-[var(--venue-accent)]"
                          style={{ "--venue-accent": accent }}
                        >
                          {l.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Phone */}
              {venue?.phone && (
                <a
                  href={`tel:${venue.phone}`}
                  className={`hidden md:flex items-center gap-1 text-sm font-medium transition-colors ${scrolled ? "text-stone-700 dark:text-stone-300" : "text-white"
                    }`}
                >
                  <Phone size={14} /> {venue.phone}
                </a>
              )}

              {/* Check Availability button (only when the calendar is shown) */}
              {showAvailability && (
                <a
                  href="#availability"
                  className="hidden md:inline-block px-4 py-2 rounded-full text-sm font-semibold text-white transition-transform hover:scale-105"
                  style={{ backgroundColor: accent }}
                >
                  Check Availability
                </a>
              )}

              {/* Dark mode toggle */}
              <button
                onClick={() => setDark(!dark)}
                aria-label="Toggle dark mode"
                className={`p-2 rounded-full transition-colors ${scrolled
                    ? "text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                    : "text-white hover:bg-white/20"
                  }`}
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle menu"
                className={`md:hidden p-2 rounded-full ${scrolled ? "text-stone-700 dark:text-stone-300" : "text-white"
                  }`}
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile menu (shows every selected link) */}
          {menuOpen && (
            <div className="md:hidden bg-white dark:bg-stone-950 border-t border-stone-100 dark:border-stone-800 px-6 py-4 space-y-3 max-h-[75vh] overflow-y-auto">
              {navLinks.map((l) => (
                <a
                  key={l.key || l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="block text-sm font-medium text-stone-700 dark:text-stone-300 hover:text-[var(--venue-accent)]"
                  style={{ "--venue-accent": accent }}
                >
                  {l.label}
                </a>
              ))}

              <a
                href="#inquiry"
                onClick={() => setMenuOpen(false)}
                className="block text-center px-4 py-2 rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: accent }}
              >
                Enquire Now
              </a>
            </div>
          )}
        </nav>

        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="bg-stone-950 dark:bg-black text-stone-400 py-8 text-center text-sm">
          <SocialFooterRow venue={venue} />
          <p className="font-medium text-white mb-1">{venueName}</p>
          <p>© {new Date().getFullYear()} {venueName}. All rights reserved.</p>
          <p className="mt-1 text-xs">
            Powered by{" "}
            <a
              href={DISCOVERY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 hover:underline transition-colors"
            >
              In2Fest
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}