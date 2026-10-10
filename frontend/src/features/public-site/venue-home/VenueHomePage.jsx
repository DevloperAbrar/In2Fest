import React from "react";
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
import AvailabilityCalendar from "./availability-calendar/AvailabilityCalendar.jsx";
import DynamicSectionRenderer from "./venue-home/DynamicSectionRenderer.jsx";
import LoginPage from "../auth/LoginPage.jsx";
import { getTemplateSections } from "./templates/index.jsx";
import { resolveNav } from "../../lib/navItems";

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
  const { data: venue, loading: venueLoading } = useFetch(
    subdomain ? `/venues/public/${subdomain}` : null
  );

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
  const showAvailability = venue.show_availability !== false;
  const showSlotsPackages = venue.show_slots_packages !== false;

  // Navbar links chosen by the vendor in Website Builder > "Website menu"
  const navItems = resolveNav(venue, { slots, packages });

  return (
    <PublicLayout venueName={venue.hall_name} venue={venue} navItems={navItems}>
      {visibleSections.map((section) => {
        if (section.type === "contact") {
          return (
            <React.Fragment key="contact">
              {/* Live slots & packages from the Slots page */}
              {showSlotsPackages && (
                <SlotSection venue={venue} slots={slots} packages={packages} />
              )}
              {showAvailability && <AvailabilityCalendar venue={venue} />}
              <T.ContactSection venue={venue} slots={slots} />
            </React.Fragment>
          );
        }

        // The manual "packages" website section is replaced by the live
        // Slots & Packages section above, so don't render it twice.
        if (section.type === "packages") return null;

        const CoreComponent = CORE_COMPONENTS[section.type];
        if (CoreComponent) return <CoreComponent key={section.type} venue={venue} />;
        const dIdx = dynamicIdx++;
        return <DynamicSectionRenderer key={section.type} type={section.type} config={section.config} venue={venue} index={dIdx} />;
      })}
    </PublicLayout>
  );
}