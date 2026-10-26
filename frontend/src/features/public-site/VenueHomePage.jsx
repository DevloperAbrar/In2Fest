import React, { useState } from "react";
import PublicLayout from "../../components/layout/PublicLayout.jsx";
import Loader from "../../components/common/Loader";
import { useFetch } from "../../hooks/useFetch";
import HeroSection from "./venue-home/HeroSection.jsx";
import AboutSection from "./venue-home/AboutSection.jsx";
import ServicesSection from "./venue-home/ServicesSection.jsx";
import GallerySection from "./venue-home/GallerySection.jsx";
import TestimonialsSection from "./venue-home/TestimonialsSection.jsx";
import ContactSection from "./venue-home/ContactSection.jsx";
import SlotSection from "./venue-home/SlotSection.jsx";
import FreeTrialModal from "./venue-home/FreeTrialModal.jsx";
import VerticalHero from "./venue-home/verticals/VerticalHero.jsx";
import FoodHero from "./venue-home/verticals/FoodHero.jsx";
import AvailabilityCalendar from "./availability-calendar/AvailabilityCalendar.jsx";
import DynamicSectionRenderer from "./venue-home/DynamicSectionRenderer.jsx";
import LoginPage from "../auth/LoginPage.jsx";
import { getTemplateSections, TEMPLATES } from "./templates/index.jsx";
import { resolveNav } from "../../lib/navItems";
import { getVertical, resolveAccent, waLink, waDigits } from "../../lib/verticals";
import { getSiteTheme } from "../../lib/siteTheme";
import { useBusinessProfile } from "../../hooks/useBusinessProfile";

const DEFAULT_SECTIONS = {
  HeroSection,
  AboutSection,
  ServicesSection,
  GallerySection,
  TestimonialsSection,
  ContactSection,
};

const FALLBACK_ORDER = [
  { type: "hero", visible: true },
  { type: "about", visible: true },
  { type: "services", visible: true },
  { type: "gallery", visible: true },
  { type: "testimonials", visible: true },
  { type: "contact", visible: true },
];

const getSubdomain = () => {
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  const reserved = ["www", "app", "api", "admin"];

  // Production: subdomain.venuesafar.com
  if (parts.length >= 3 && !reserved.includes(parts[0])) {
    return parts[0];
  }

  // Local dev: ar-event.localhost OR ar-event.localhost:5173
  // hostname doesn't include port, so just check if last part is "localhost"
  if (parts.length === 2 && parts[1] === "localhost" && !reserved.includes(parts[0])) {
    return parts[0];
  }

  // Fallback: ?venue=ar-event query param
  const params = new URLSearchParams(window.location.search);
  return params.get("venue") || null;
};

export default function VenueHomePage() {
  const subdomain = getSubdomain();
  const [trialOpen, setTrialOpen] = useState(false);
  const { data: venue, loading: venueLoading } = useFetch(
    subdomain ? `/venues/public/${subdomain}` : null
  );

  const { profile: bizProfile } = useBusinessProfile(venue?.business_category, venue?.secondary_categories || []);

  // PUBLIC slots + packages endpoints (no login needed). Used for the
  // "Slots & Packages" section and the "Select Slot" dropdown in the
  // enquiry form - the availability calendar fetches its own data.
  const { data: slots } = useFetch(
    venue ? `/venues/${venue.id}/slots/public` : null,
    { skip: !venue, deps: [venue?.id] }
  );
  const { data: packages } = useFetch(
    venue ? `/venues/${venue.id}/packages/public` : null,
    { skip: !venue, deps: [venue?.id] }
  );

  if (venueLoading) return <Loader fullScreen />;
  if (!subdomain) return <LoginPage />;

  if (!venue) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4 bg-paper">
        <div>
          <h1 className="font-display text-2xl font-semibold mb-2 text-ink-900">Venue not found</h1>
          <p className="text-ink-900/50">This venue page doesn't exist or isn't live yet.</p>
        </div>
      </div>
    );
  }

  // ---- Vertical (gym / shop / food / venue) ------------------------------------------
  const vertical = getVertical(venue);
  // A vendor who explicitly picked Aurora / Bloom / Slate keeps that hero.
  // Classic (null or the legacy "template-1") gets the category-specific experience.
  const useVertical = vertical.key !== "venue" && !TEMPLATES[venue.template_id];
  const v = useVertical ? { ...venue, theme_color: resolveAccent(venue, vertical) } : venue;
  const siteTheme = getSiteTheme(venue, useVertical ? vertical.key : null);

  const T = getTemplateSections(venue.template_id, DEFAULT_SECTIONS);

  const CORE_COMPONENTS = {
    hero: T.HeroSection,
    about: T.AboutSection,
    services: T.ServicesSection,
    gallery: T.GallerySection,
    testimonials: T.TestimonialsSection,
    contact: T.ContactSection,
  };

  const sections =
    venue.page_sections && venue.page_sections.length > 0
      ? venue.page_sections
      : FALLBACK_ORDER;
  const visibleSections = sections.filter((s) => s.visible !== false);
  let dynamicIdx = 0;

  // Vendor controls from Website Builder > "Show on my website"
  const showAvailability = venue.show_availability !== false && !!bizProfile?.modules?.includes("slots");
  // Restaurants never show event-style slots and packages.
  const showSlotsPackages = venue.show_slots_packages !== false && vertical.key !== "food";

  // Navbar links chosen by the vendor in Website Builder > "Website menu"
  const navItems = resolveNav(venue, { slots, packages });

  // ---- Actions & primary CTA ----------------------------------------------------------
  const actions = { openTrial: () => setTrialOpen(true) };
  let primaryCta = { label: "Enquire Now", href: "#inquiry" };
  if (vertical.key === "gym") {
    primaryCta = { label: "Join Now", onClick: actions.openTrial };
  } else if (vertical.key === "shop" && vertical.food) {
    primaryCta = { label: "Order for Pickup", href: "#section-product_catalog" };
  } else if (vertical.key === "shop") {
    const link = waLink(v, `Hi ${v.hall_name}, I'd like to know more about your products.`);
    primaryCta = link ? { label: "Order on WhatsApp", href: link, external: true } : { label: "Enquire", href: "#inquiry" };
  } else if (vertical.key === "food") {
    const hasMenu = sections.some((s) => s.type === "menu" && s.visible !== false);
    primaryCta = { label: "Order Online", href: hasMenu ? "#section-menu" : "#section-product_catalog" };
  }

  // The hero shows the numbers bar itself, so the separate "stats" band is skipped in that case.
  const statsSection = sections.find((s) => s.type === "stats" && s.visible !== false);
  const heroStats = statsSection?.config?.items || [];

  return (
    <PublicLayout
      venueName={v.hall_name}
      venue={v}
      navItems={navItems}
      vertical={vertical}
      primaryCta={primaryCta}
      showAvailability={showAvailability}
      siteTheme={siteTheme}
    >
      {visibleSections.map((section) => {
        if (section.type === "hero") {
          return (
            <React.Fragment key="hero">
              {useVertical ? (
                vertical.key === "food" ? (
                  <FoodHero venue={v} stats={heroStats} />
                ) : (
                  <VerticalHero venue={v} vertical={vertical} stats={heroStats} actions={actions} hasWhatsApp={!!waDigits(v)} />
                )
              ) : (
                <T.HeroSection venue={v} />
              )}
            </React.Fragment>
          );
        }

        if (section.type === "stats" && useVertical) return null;

        if (section.type === "contact") {
          return (
            <React.Fragment key="contact">
              {/* Live slots & packages from the Slots page */}
              {showSlotsPackages && (
                <SlotSection venue={v} slots={slots} packages={packages} />
              )}
              {showAvailability && <AvailabilityCalendar venue={v} />}
              <T.ContactSection venue={v} slots={slots} />
            </React.Fragment>
          );
        }

        // The manual "packages" website section is replaced by the live
        // Slots & Packages section above  - except for gyms, where "packages"
        // becomes the live Membership Plans section.
        if (section.type === "packages" && vertical.key !== "gym") return null;

        const CoreComponent = CORE_COMPONENTS[section.type];
        if (CoreComponent) return <CoreComponent key={section.type} venue={v} />;
        const dIdx = dynamicIdx++;
        return (
          <DynamicSectionRenderer
            key={section.type}
            type={section.type}
            config={section.config}
            venue={v}
            index={dIdx}
            vertical={vertical}
            actions={actions}
          />
        );
      })}

      {trialOpen && vertical.key === "gym" && (
        <FreeTrialModal venueId={venue.id} theme={v.theme_color} onClose={() => setTrialOpen(false)} />
      )}
    </PublicLayout>
  );
}