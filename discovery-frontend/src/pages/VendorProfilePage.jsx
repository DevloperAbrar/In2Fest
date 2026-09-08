import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import api from "../lib/api";
import HeroSection from "../components/vendor-profile/HeroSection";
import PhotoGallery from "../components/vendor-profile/PhotoGallery";
import ServicesGrid from "../components/vendor-profile/ServicesGrid";
import ContactButtons from "../components/vendor-profile/ContactButtons";
import SimilarVendors from "../components/vendor-profile/SimilarVendors";
import InquiryModal from "../components/vendor-profile/InquiryModal";
import AvailabilityCalendar from "../components/vendor-profile/AvailabilityCalendar";
import BreadcrumbNav from "../components/seo/BreadcrumbNav";
import ReviewsSection from "../components/vendor-profile/ReviewsSection.jsx";
import VendorCTAPrompt from "../components/vendor-profile/VendorCTAPrompt";
import { VendorProfileSchema } from "../components/seo/SchemaMarkup";
import {
  MapPin, Award, Users, Calendar, Languages,
  ShieldCheck, Banknote, Copy, MessageCircle, ExternalLink,
  Globe, PlayCircle, Quote,
} from "lucide-react";

function InstagramIcon(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

function YoutubeIcon(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="2" y="5" width="20" height="14" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 9l5 3-5 3V9z" fill="currentColor" />
    </svg>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 md:p-6 shadow-sm">
      {title && <h2 className="font-display font-bold text-navy-900 mb-4 text-lg">{title}</h2>}
      {children}
    </div>
  );
}

function copyText(text) {
  navigator.clipboard.writeText(text);
}

export default function VendorProfilePage() {
  const { city, category, slug: vendorSlug } = useParams();
  const [data, setData] = useState(null);
  const [showInquiry, setShowInquiry] = useState(false);

  useEffect(() => {
    api.get(`/vendor/${city}/${category}/${vendorSlug}`).then(({ data }) => setData(data.data));
  }, [city, category, vendorSlug]);

  if (!data) return <div className="max-w-6xl mx-auto px-4 py-16 text-gray-400">Loading...</div>;

  const { venue, similar_vendors, seo } = data;
  const categoryLabel = category.replace(/-/g, " ");

  // ✅ single source of truth for the branded subdomain link
  const brandedWebsiteUrl = (venue.slug || vendorSlug)
    ? `http://${venue.slug || vendorSlug}.${import.meta.env.VITE_BASE_DOMAIN}`
    : null;

  const stats = [
    {
      icon: Banknote,
      label: "Starting Price",
      value: venue.starting_price ? `₹${Number(venue.starting_price).toLocaleString("en-IN")}` : "On request",
    },
    { icon: Users, label: "Team Size", value: venue.team_size ? `${venue.team_size} members` : "—" },
    { icon: Calendar, label: "Established", value: venue.year_established || "—" },
    {
      icon: Languages,
      label: "Languages",
      value: venue.languages_spoken?.length ? venue.languages_spoken.join(", ") : "—",
    },
  ];

  return (
    <>
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <link rel="canonical" href={seo.canonical || window.location.href} />

        {/* ✅ Yeh add karo */}
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:image" content={venue.hero_image_url || `https://www.in2fest.com/og-default.jpg`} />
        <meta property="og:url" content={seo.canonical} />
        <meta property="og:type" content="business.business" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={venue.hero_image_url} />
      </Helmet>

      {/* JSON-LD Schema for Google */}
      <VendorProfileSchema venue={venue} city={city} category={category} />

      <BreadcrumbNav items={[
        { label: venue.city, to: `/${city}` },
        { label: categoryLabel, to: `/${city}/${category}` },
        { label: venue.hall_name }
      ]} />

      {/* Hero */}
      <HeroSection venue={venue} />

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
              <div className="w-9 h-9 rounded-full bg-navy-50 flex items-center justify-center mx-auto mb-2">
                <Icon size={16} className="text-navy-700" />
              </div>
              <p className="text-[11px] text-gray-400 font-medium">{label}</p>
              <p className="font-semibold text-navy-900 text-sm mt-0.5 truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* Specialty tagline */}
        {venue.specialty_tagline && (
          <div className="relative bg-navy-50/60 border-l-4 border-gold-500 rounded-r-xl px-5 py-4 mb-8">
            <Quote size={22} className="absolute top-3 right-4 text-navy-200" />
            <p className="text-navy-800 text-sm font-medium italic pr-6">{venue.specialty_tagline}</p>
          </div>
        )}

        {/* Contact buttons */}
        <div className="mb-8">
          <ContactButtons venue={venue} onSendInquiry={() => setShowInquiry(true)} />
        </div>

        {/* Social links */}
        {(venue.instagram_handle || venue.youtube_channel_link || brandedWebsiteUrl || venue.video_intro_url) && (
          <div className="flex flex-wrap gap-2 mb-8">
            {venue.instagram_handle && (
              <a href={`https://instagram.com/${venue.instagram_handle.replace("@", "")}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:border-pink-200 hover:text-pink-600 hover:bg-pink-50 text-sm px-4 py-2 rounded-xl transition-colors">
                <InstagramIcon /> Instagram
              </a>
            )}
            {venue.youtube_channel_link && (
              <a href={venue.youtube_channel_link} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-600 hover:bg-red-50 text-sm px-4 py-2 rounded-xl transition-colors">
                <YoutubeIcon /> YouTube
              </a>
            )}
            {brandedWebsiteUrl && (
              <a href={brandedWebsiteUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:border-navy-300 hover:text-navy-700 hover:bg-navy-50 text-sm px-4 py-2 rounded-xl transition-colors">
                <Globe size={14} /> Website
              </a>
            )}
            {venue.video_intro_url && (
              <a href={venue.video_intro_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 border border-accent-200 text-accent-700 hover:bg-accent-50 text-sm px-4 py-2 rounded-xl transition-colors">
                <PlayCircle size={14} /> Watch Intro Video
              </a>
            )}
          </div>
        )}

        {/* Photo Gallery */}
        <div className="mb-8">
          <PhotoGallery gallery={venue.gallery} />
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT - main content */}
          <div className="lg:col-span-2 space-y-6">

            {venue.long_description && (
              <SectionCard title="About">
                <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                  {venue.long_description}
                </p>
              </SectionCard>
            )}

            <SectionCard title="Services & Amenities">
              <ServicesGrid services={venue.marketplace_services} />
            </SectionCard>

            {(venue.starting_price || venue.pricing_mode === "per_service" || venue.pricing_note) && (
              <SectionCard title="Pricing">
                {venue.pricing_mode === "per_service" && venue.service_prices && Object.keys(venue.service_prices).length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {Object.entries(venue.service_prices).map(([service, price]) =>
                      price ? (
                        <div key={service} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2 last:border-0">
                          <span className="text-gray-600">{service}</span>
                          <span className="font-semibold text-gray-900">₹{Number(price).toLocaleString("en-IN")}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-8 mb-4">
                    {venue.starting_price && (
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Starting from</p>
                        <p className="text-2xl font-bold text-navy-700">₹{Number(venue.starting_price).toLocaleString("en-IN")}</p>
                      </div>
                    )}
                    {venue.maximum_price && (
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Up to</p>
                        <p className="text-2xl font-bold text-gray-600">₹{Number(venue.maximum_price).toLocaleString("en-IN")}</p>
                      </div>
                    )}
                  </div>
                )}
                {venue.pricing_note && (
                  <p className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
                    {venue.pricing_note}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {venue.advance_payment_percentage && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400">Advance required</p>
                      <p className="text-sm font-semibold text-gray-700">{venue.advance_payment_percentage}%</p>
                    </div>
                  )}
                  {venue.cancellation_policy && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400">Cancellation policy</p>
                      <p className="text-sm font-semibold text-gray-700">{venue.cancellation_policy}</p>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {venue.id && <AvailabilityCalendar venueId={venue.id} />}

            {venue.famous_events_handled && (
              <SectionCard title="Notable Events Handled">
                <p className="text-sm text-gray-600 leading-relaxed">{venue.famous_events_handled}</p>
              </SectionCard>
            )}

            {venue.awards_recognition && (
              <SectionCard title="Awards & Recognition">
                <div className="flex items-start gap-3">
                  <Award size={18} className="text-gold-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600 leading-relaxed">{venue.awards_recognition}</p>
                </div>
              </SectionCard>
            )}

            <SectionCard>
              <ReviewsSection venueId={venue.id} />
            </SectionCard>

            <SimilarVendors vendors={similar_vendors} />
          </div>

          {/* RIGHT - sidebar */}
          <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Get in touch</h3>

              {brandedWebsiteUrl && (
                <a href={brandedWebsiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-navy-50 hover:bg-navy-100 border border-navy-100 text-navy-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  <ExternalLink size={15} /> Visit Their Website
                </a>
              )}

              {venue.whatsapp_number && (
                <>
                  <a href={`https://wa.me/${venue.whatsapp_number.replace(/\D/g, "")}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  >
                    <MessageCircle size={15} /> WhatsApp Now
                  </a>
                  <button
                    onClick={() => copyText(venue.whatsapp_number)}
                    className="flex items-center justify-center gap-2 w-full border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  >
                    <Copy size={14} /> Copy Number
                  </button>
                </>
              )}

              <button
                onClick={() => setShowInquiry(true)}
                className="flex items-center justify-center gap-2 w-full text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 bg-gradient-to-r from-accent-500 to-accent-600"
              >
                Send Inquiry
              </button>
            </div>

            {(venue.serviceAreas?.length > 0 || venue.service_travel_note) && (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Service Areas</h3>
                {venue.serviceAreas?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {venue.serviceAreas.map((c) => (
                      <span key={c.id} className="text-xs bg-navy-50 text-navy-700 px-2.5 py-1 rounded-full border border-navy-100">
                        {c.name}
                      </span>
                    ))}
                  </div>
                )}
                {venue.service_travel_note && (
                  <p className="text-xs text-gray-500 leading-relaxed">{venue.service_travel_note}</p>
                )}
              </div>
            )}

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Why trust this listing</h3>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <ShieldCheck size={14} className="text-green-500" /> Verified on In2Fest
                </div>
                {venue.year_established && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Calendar size={14} className="text-blue-400" /> In business since {venue.year_established}
                  </div>
                )}
                {venue.languages_spoken?.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Languages size={14} className="text-purple-400" /> Speaks {venue.languages_spoken.join(", ")}
                  </div>
                )}
                {venue.team_size && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Users size={14} className="text-gold-500" /> Team of {venue.team_size}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Location</h3>
              <p className="text-xs text-gray-500 mb-3">
                {venue.primary_locality && `${venue.primary_locality}, `}{venue.city}
                {venue.full_pincode && ` - ${venue.full_pincode}`}
              </p>
              <a href={venue.google_maps_link || `https://www.google.com/maps/search/${encodeURIComponent(`${venue.hall_name} ${venue.city}`)}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-accent-600 hover:underline font-medium"
              >
                <MapPin size={13} /> View on Google Maps
              </a>
            </div>
          </div>
        </div>
      </div>

      {showInquiry && <InquiryModal venue={venue} onClose={() => setShowInquiry(false)} />}

      {/* Scroll-triggered "become a vendor" nudge - shows once per session */}
      <VendorCTAPrompt />
    </>
  );
}