import React, { useState, useEffect, useRef } from "react";
import { Moon, Sun, Menu, X, Phone, ChevronDown, MessageCircle } from "lucide-react";
import { DISCOVERY_URL } from "../../lib/constants";
import SocialFooterRow from "./SocialFooterRow.jsx";
import { MAX_INLINE_NAV_LINKS as MAX_INLINE_LINKS } from "../../lib/navItems";
import { waDigits, onAccent } from "../../lib/verticals";
import { getSiteBackground, readStoredMode, storeMode } from "../../lib/siteTheme";

// Renders the primary call-to-action either as a link or as a button (e.g. opens the free-trial modal).
function CtaButton({ cta, accent, className = "", onDone }) {
  if (!cta) return null;
  const style = { backgroundColor: accent, color: onAccent(accent) };
  if (cta.href) {
    return (
      <a
        href={cta.href}
        target={cta.external ? "_blank" : undefined}
        rel={cta.external ? "noopener noreferrer" : undefined}
        onClick={onDone}
        className={className}
        style={style}
      >
        {cta.label}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={() => { cta.onClick?.(); onDone?.(); }}
      className={className}
      style={style}
    >
      {cta.label}
    </button>
  );
}

export default function PublicLayout({
  venueName, venue, navItems, children,
  vertical, primaryCta, showAvailability: showAvailabilityProp, siteTheme
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const moreRef = useRef(null);

  // ---- Light / dark mode -------------------------------------------------------------
  // Aurora = dark only, Bloom / Slate = light only. Other sites follow the visitor's choice
  // (remembered), starting from the category default (gyms start dark).
  const forced = siteTheme?.forced || null;
  const themeId = siteTheme?.id || "classic";
  const [pref, setPref] = useState(() => readStoredMode() || (vertical?.darkDefault ? "dark" : "light"));
  const isDark = forced ? forced === "dark" : pref === "dark";
  const toggleMode = () => {
    const next = isDark ? "light" : "dark";
    setPref(next);
    storeMode(next);
  };

  // Navbar text colour while it sits on top of the hero (Bloom has a light hero).
  const ink = siteTheme?.navTop === "ink";
  const brandTone = scrolled ? "text-stone-900 dark:text-white" : ink ? "text-stone-900" : "text-white";
  const linkTone = scrolled ? "text-stone-700 dark:text-stone-300" : ink ? "text-stone-800" : "text-white";
  const iconBtnTone = scrolled
    ? "text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
    : ink
      ? "text-stone-800 hover:bg-black/5"
      : "text-white hover:bg-white/20";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Match the page background behind the site and the mobile browser bar to the theme.
  useEffect(() => {
    const bg = getSiteBackground(themeId, isDark);
    const prevBody = document.body.style.backgroundColor;
    document.body.style.backgroundColor = bg;

    let meta = document.querySelector('meta[name="theme-color"]');
    const prevMeta = meta ? meta.getAttribute("content") : null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", bg);

    return () => {
      document.body.style.backgroundColor = prevBody;
      if (prevMeta !== null) meta.setAttribute("content", prevMeta);
    };
  }, [themeId, isDark]);

  // Close the "More" dropdown when clicking outside it.
  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [moreOpen]);

  // The page tells us whether the availability calendar is really shown (module + vendor switch).
  const showAvailability =
    typeof showAvailabilityProp === "boolean" ? showAvailabilityProp : venue?.show_availability !== false;
  const isVenueStyle = !vertical || vertical.key === "venue";

  // Menu chosen by the vendor (Website Builder > "Website menu").
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

  const phoneDigits = String(venue?.phone || "").replace(/\D/g, "");
  const wa = waDigits(venue);
  const showStickyBar = Boolean(phoneDigits || wa || primaryCta);

  return (
    <div
      className={`public-site site-root site-${themeId} ${isDark ? "dark" : ""} min-h-screen flex flex-col`}
      style={{ colorScheme: isDark ? "dark" : "light" }}
    >
      <div
        className="text-stone-900 dark:text-stone-100 transition-colors duration-300"
        style={{ backgroundColor: "var(--tone-0)" }}
      >

        {/* Navbar */}
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
            ? "bg-white/95 dark:bg-stone-950/95 backdrop-blur-md shadow-md shadow-black/5"
            : "bg-transparent"
          }`}>
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-3.5 flex items-center justify-between gap-4">
            <span className={`font-bold text-lg truncate transition-colors ${brandTone}`}>
              {venueName}
            </span>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-6">
              {inlineLinks.map((l) => (
                <a
                  key={l.key || l.href}
                  href={l.href}
                  className={`text-sm font-medium transition-colors hover:text-[var(--venue-accent)] ${linkTone}`}
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
                    className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-[var(--venue-accent)] ${linkTone}`}
                    style={{ "--venue-accent": accent }}
                  >
                    More <ChevronDown size={14} className={`transition-transform ${moreOpen ? "rotate-180" : ""}`} />
                  </button>

                  {moreOpen && (
                    <div className="absolute right-0 mt-3 w-52 rounded-xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 shadow-xl py-2 text-stone-700 dark:text-stone-300">
                      {overflowLinks.map((l) => (
                        <a
                          key={l.key || l.href}
                          href={l.href}
                          onClick={() => setMoreOpen(false)}
                          className="block px-4 py-2 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-[var(--venue-accent)]"
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

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Phone */}
              {venue?.phone && (
                <a
                  href={`tel:${venue.phone}`}
                  className={`hidden lg:flex items-center gap-1 text-sm font-medium transition-colors ${linkTone}`}
                >
                  <Phone size={14} /> {venue.phone}
                </a>
              )}

              {/* Venue-style sites: "Check Availability" only when the calendar is really shown */}
              {isVenueStyle && showAvailability && (
                <a
                  href="#availability"
                  className="hidden md:inline-block px-4 py-2 rounded-full text-sm font-semibold transition-transform hover:scale-105"
                  style={{ backgroundColor: accent, color: onAccent(accent) }}
                >
                  Check Availability
                </a>
              )}

              {/* Gym / shop: their own primary action (Free Trial / Order on WhatsApp) */}
              {!isVenueStyle && primaryCta && (
                <CtaButton
                  cta={primaryCta}
                  accent={accent}
                  className="hidden md:inline-block px-5 py-2 rounded-full text-sm font-bold transition-transform hover:scale-105"
                />
              )}

              {/* Light / dark toggle (hidden for templates that are designed for one mode only) */}
              {!forced && (
                <button
                  onClick={toggleMode}
                  aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                  className={`p-2 rounded-full transition-colors ${iconBtnTone}`}
                >
                  {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle menu"
                aria-expanded={menuOpen}
                className={`md:hidden p-2 rounded-full transition-colors ${iconBtnTone}`}
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile menu: slides open (shows every selected link) */}
          <div
            className={`md:hidden grid transition-all duration-300 ease-out ${menuOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"}`}
          >
            <div className="overflow-hidden">
              <div className="bg-white dark:bg-stone-950 border-t border-stone-100 dark:border-stone-800 px-6 py-4 space-y-3 max-h-[75vh] overflow-y-auto">
                {navLinks.map((l) => (
                  <a
                    key={l.key || l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="block py-1 text-sm font-medium text-stone-700 dark:text-stone-300 hover:text-[var(--venue-accent)]"
                    style={{ "--venue-accent": accent }}
                  >
                    {l.label}
                  </a>
                ))}

                {primaryCta ? (
                  <CtaButton
                    cta={primaryCta}
                    accent={accent}
                    onDone={() => setMenuOpen(false)}
                    className="block w-full text-center px-4 py-2.5 rounded-full text-sm font-semibold"
                  />
                ) : (
                  <a
                    href="#inquiry"
                    onClick={() => setMenuOpen(false)}
                    className="block text-center px-4 py-2.5 rounded-full text-sm font-semibold"
                    style={{ backgroundColor: accent, color: onAccent(accent) }}
                  >
                    Enquire Now
                  </a>
                )}
              </div>
            </div>
          </div>
        </nav>

        <main className="flex-1">{children}</main>

        {/* Footer (extra bottom padding on mobile so the sticky action bar never covers it) */}
        <footer className="bg-stone-950 dark:bg-black text-stone-400 pt-8 pb-24 md:pb-8 text-center text-sm">
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

      {/* Sticky mobile action bar: Call / WhatsApp / primary action */}
      {showStickyBar && (
        <div
          className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-stone-950/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 px-3 pt-2"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
        >
          <div className="flex gap-2">
            {phoneDigits && (
              <a
                href={`tel:${venue.phone}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-sm font-semibold text-stone-800 dark:text-stone-100 active:scale-95 transition-transform"
              >
                <Phone size={15} /> Call
              </a>
            )}
            {wa && (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold active:scale-95 transition-transform"
              >
                <MessageCircle size={15} /> WhatsApp
              </a>
            )}
            <CtaButton
              cta={primaryCta}
              accent={accent}
              className="flex-[1.4] flex items-center justify-center py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform"
            />
          </div>
        </div>
      )}
    </div>
  );
}