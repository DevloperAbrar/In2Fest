import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import api from "../lib/api";
import HeroSection from "../components/vendor-profile/HeroSection";
import PhotoGallery from "../components/vendor-profile/PhotoGallery";
import ServicesGrid from "../components/vendor-profile/ServicesGrid";
import ContactButtons, { ContactCard, MobileActionBar } from "../components/vendor-profile/ContactButtons";
import SimilarVendors from "../components/vendor-profile/SimilarVendors";
import InquiryModal from "../components/vendor-profile/InquiryModal";
import AvailabilityCalendar from "../components/vendor-profile/AvailabilityCalendar";
import ProfileAttributes, { formatAttrValue, hasAttributeContent } from "../components/vendor-profile/ProfileAttributes";
import BusinessHoursCard, { getOpenStatus } from "../components/vendor-profile/BusinessHoursCard";
import BreadcrumbNav from "../components/seo/BreadcrumbNav";
import ReviewsSection from "../components/vendor-profile/ReviewsSection.jsx";
import VendorCTAPrompt from "../components/vendor-profile/VendorCTAPrompt";
import VideoModal from "../components/vendor-profile/VideoModal";
import LiveSections from "../components/vendor-profile/LiveSections";
import VerticalSchema from "../components/vendor-profile/VerticalSchema";
import { SectionCard, SectionNav, ExpandableText } from "../components/vendor-profile/ProfileKit";
import { buildWhatsAppLink } from "../components/vendor-profile/verticalCopy";
import PageLoader from "../components/common/PageLoader";
import { getVideoEmbed } from "../lib/videoEmbed";
import { getVendorSiteUrl } from "../lib/vendorSiteUrl";
import {
  MapPin, Award, Users, Calendar, Languages, ShieldCheck, Banknote, Globe,
  PlayCircle, Quote, Tag, Info, Wallet, Navigation, Store, ArrowUpRight, Sparkles,
} from "lucide-react";

const APP_URL = import.meta.env.VITE_APP_URL || "http://localhost:5173";

// Vendors often type "mysite.com" without https://. This adds it, and only
// allows http/https links so nothing unsafe can be rendered as a link.
function normalizeExternalUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function InstagramIcon(props) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

function YoutubeIcon(props) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="2" y="5" width="20" height="14" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 9l5 3-5 3V9z" fill="currentColor" />
    </svg>
  );
}

const PILL_TONES = {
  pink: "hover:border-pink-200 hover:text-pink-600 hover:bg-pink-50",
  red: "hover:border-red-200 hover:text-red-600 hover:bg-red-50",
  navy: "hover:border-navy-300 hover:text-navy-700 hover:bg-navy-50",
  accent: "border-accent-200 text-accent-700 hover:bg-accent-50",
};

function LinkPill({ href, onClick, icon, label, tone = "navy" }) {
  const cls = `inline-flex items-center gap-2 border border-gray-200 text-gray-600 text-sm font-medium px-4 py-2 rounded-full transition-all hover:-translate-y-0.5 ${PILL_TONES[tone]}`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {icon} {label}
      </button>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {icon} {label}
    </a>
  );
}

const STAT_TINTS = [
  "bg-accent-50 text-accent-600",
  "bg-emerald-50 text-emerald-600",
  "bg-sky-50 text-sky-600",
  "bg-gold-400/20 text-gold-600",
];

const MD_COLS = { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" };

function StatCard({ icon: Icon, label, value, tint, index, spanOnMobile }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 + index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className={`flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-3.5 md:p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all ${
        spanOnMobile ? "col-span-2 md:col-span-1" : ""
      }`}
    >
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${tint}`}>
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
        <p className="font-display font-bold text-navy-900 text-[15px] mt-0.5 truncate">{value}</p>
      </div>
    </motion.div>
  );
}

export default function VendorProfilePage() {
  const { city, category, slug: vendorSlug } = useParams();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [showInquiry, setShowInquiry] = useState(false);
  const [inquiryDate, setInquiryDate] = useState("");
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    let alive = true;
    setData(null);
    setFailed(false);
    api
      .get(`/vendor/${city}/${category}/${vendorSlug}`)
      .then(({ data }) => { if (alive) setData(data.data); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [city, category, vendorSlug]);

  if (failed) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-navy-50 text-navy-700 flex items-center justify-center mb-4">
          <Store size={26} />
        </div>
        <h1 className="font-display font-bold text-navy-900 text-xl">We could not find this business</h1>
        <p className="text-sm text-gray-500 mt-2">It may have moved or is no longer listed.</p>
        <Link
          to="/search"
          className="inline-flex items-center gap-2 mt-6 text-white text-sm font-semibold px-5 py-3 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600"
        >
          Browse businesses
        </Link>
      </div>
    );
  }

  if (!data) return <PageLoader />;

  const { venue, similar_vendors, seo, profile_schema: schema, live } = data;
  const vertical = schema?.vertical;
  const waLink = buildWhatsAppLink(venue.whatsapp_number, vertical, venue.hall_name);

  const L = schema?.labels || {};
  const attrs = venue.profile_attributes || {};
  const categoryLabel = category.replace(/-/g, " ");
  const videoEmbed = getVideoEmbed(venue.video_intro_url);

  // ----- what the vendor's PLAN allows visitors to see / do -----
  // Everything defaults to OFF if the API did not send plan_features.
  const planFeatures = data.plan_features || {};
  const canInquire = !!planFeatures.inquiries;
  const canShowReviews = !!planFeatures.reviews;
  const hasWebsite = !!planFeatures.website_builder;
  const showAvailability = !!planFeatures.slots && schema?.features?.availability !== false;

  // Branded website link only exists for plans that include the website builder.
  const brandedWebsiteUrl = hasWebsite ? getVendorSiteUrl(venue.slug || vendorSlug) : null;

  // The vendor's own website, typed in Marketplace Profile > Social & Media.
  // Works for every plan, including free listing.
  const ownWebsiteUrl = normalizeExternalUrl(venue.external_website);

  const openInquiry = canInquire ? () => setShowInquiry(true) : undefined;
  const whatsappLabel =
    ["shops", "food"].includes(vertical?.key) && vertical?.cta_label ? vertical.cta_label : "WhatsApp Now";
  const inquiryLabel = L.inquiry || "Send Inquiry";

  // ----- price -----
  const unit = venue.pricing_unit || "";
  const priceText = venue.starting_price
    ? `₹${Number(venue.starting_price).toLocaleString("en-IN")}${unit ? ` ${unit}` : ""}`
    : "On request";

  // ----- stats strip: chosen by the kind of business -----
  const statItems = (schema?.stats || ["starting_price", "team_size", "year_established", "languages_spoken"])
    .map((key) => {
      if (key === "starting_price") return { icon: Banknote, label: L.price || "Starting Price", value: priceText, always: true };
      if (key === "team_size") return { icon: Users, label: L.team || "Team Size", value: venue.team_size ? `${venue.team_size} members` : "" };
      if (key === "year_established") return { icon: Calendar, label: "Established", value: venue.year_established || "" };
      if (key === "languages_spoken") return { icon: Languages, label: "Languages", value: venue.languages_spoken?.length ? venue.languages_spoken.join(", ") : "" };
      if (key.startsWith("attr:")) {
        const attr = schema?.attributes?.find((a) => a.key === key.slice(5));
        if (!attr) return null;
        return { icon: Tag, label: attr.label, value: formatAttrValue(attr, attrs[attr.key]) };
      }
      return null;
    })
    .filter((s) => s && (s.always || s.value));

  const mdCols = MD_COLS[Math.min(Math.max(statItems.length, 1), 4)];
  const highlights = Array.isArray(attrs.highlights) ? attrs.highlights : [];

  // ----- which blocks exist (drives the tab bar) -----
  const catalogs = (schema?.attributes || []).filter(
    (a) => a.type === "catalog" && Array.isArray(attrs[a.key]) && attrs[a.key].length > 0
  );
  const hasLive =
    (live?.type === "gym_plans" && live.plans?.length > 0) ||
    (live?.type === "food_menu" && live.items?.length > 0) ||
    (live?.type === "library_shifts" && live.shifts?.length > 0) ||
    catalogs.length > 0;
  const hasPricing = !!(venue.starting_price || venue.pricing_mode === "per_service" || venue.pricing_note);
  const hasAvailability = !!(venue.id && showAvailability);
  const hasPlans = hasLive || hasPricing || hasAvailability;

  const hasLinks = !!(
    venue.instagram_handle || venue.youtube_channel_link || brandedWebsiteUrl || ownWebsiteUrl || venue.video_intro_url
  );
  const hasOverview = !!(venue.long_description || venue.specialty_tagline || highlights.length || hasLinks);
  const hasDetails = !!(
    venue.marketplace_services?.length ||
    hasAttributeContent(schema, attrs) ||
    (L.highlights && venue.famous_events_handled) ||
    venue.awards_recognition
  );
  const hasPhotos = !!venue.gallery?.length;

  const planTab =
    live?.type === "gym_plans" ? "Plans"
      : live?.type === "food_menu" ? "Menu"
        : live?.type === "library_shifts" ? "Shifts & fees"
          : "Pricing";

  const tabs = [
    hasOverview && { id: "sec-overview", label: "Overview" },
    hasPlans && { id: "sec-plans", label: planTab },
    hasDetails && { id: "sec-details", label: "Details" },
    hasPhotos && { id: "sec-photos", label: "Photos" },
    canShowReviews && { id: "sec-reviews", label: "Reviews" },
    { id: "sec-location", label: "Location" },
  ].filter(Boolean);

  const status = getOpenStatus(venue.business_hours);

  // Clean "Open in Google Maps" URL. Never pass raw internal Google embed links.
  const getCleanMapsUrl = () => {
    const link = (venue.google_maps_link || "").trim();
    const INTERNAL = /mapclient=embed|\/maps\?.*cid=|\/maps\?.*ll=.*mapclient/i;
    if (link && /^https?:\/\//i.test(link) && !INTERNAL.test(link) && !/\/maps\/embed/i.test(link)) return link;
    const pin = link.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (pin) return `https://www.google.com/maps?q=${pin[1]},${pin[2]}`;
    const at = link.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+)/);
    if (at) return `https://www.google.com/maps?q=${at[1]},${at[2]}`;
    const qc = link.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (qc) return `https://www.google.com/maps?q=${qc[1]},${qc[2]}`;
    const q = [venue.hall_name, venue.city].filter(Boolean).join(", ");
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  };

  const getEmbedUrl = () => {
    const link = (venue.google_maps_link || "").trim();
    if (!link) {
      const q = [venue.hall_name, venue.address, venue.city].filter(Boolean).join(", ");
      return q ? `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed` : null;
    }
    if (/^https:\/\/(www\.)?google\.(com|co\.in)\/maps\/embed/i.test(link)) return link;
    const pin = link.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (pin) return `https://www.google.com/maps?q=${pin[1]},${pin[2]}&z=16&output=embed`;
    const at = link.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+)/);
    if (at) return `https://www.google.com/maps?q=${at[1]},${at[2]}&z=16&output=embed`;
    const qc = link.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (qc) return `https://www.google.com/maps?q=${qc[1]},${qc[2]}&z=16&output=embed`;
    const q = [venue.hall_name, venue.address, venue.city].filter(Boolean).join(", ");
    return q ? `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed` : null;
  };

  const embedUrl = getEmbedUrl();
  const mapsOpenUrl = getCleanMapsUrl();

  const trustRows = [
    { icon: ShieldCheck, tint: "bg-emerald-50 text-emerald-600", text: "Verified on In2Fest" },
    venue.year_established && { icon: Calendar, tint: "bg-sky-50 text-sky-600", text: `In business since ${venue.year_established}` },
    venue.languages_spoken?.length > 0 && { icon: Languages, tint: "bg-purple-50 text-purple-600", text: `Speaks ${venue.languages_spoken.join(", ")}` },
    venue.team_size && { icon: Users, tint: "bg-gold-400/20 text-gold-600", text: `${L.team || "Team size"}: ${venue.team_size}` },
  ].filter(Boolean);

  return (
    <>
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <link rel="canonical" href={seo.canonical || window.location.href} />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:image" content={venue.hero_image_url || `https://in2fest.com/og-default.jpg`} />
        <meta property="og:url" content={seo.canonical} />
        <meta property="og:type" content="business.business" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={venue.hero_image_url} />
      </Helmet>

      <VerticalSchema venue={venue} vertical={vertical} attrs={attrs} showRating={canShowReviews} url={seo.canonical || window.location.href} />

      <div className="hidden md:block">
        <BreadcrumbNav items={[
          { label: venue.city, to: `/${city}` },
          { label: categoryLabel, to: `/${city}/${category}` },
          { label: venue.hall_name },
        ]} />
      </div>

      <HeroSection venue={venue} showRating={canShowReviews} status={status} />

      {/* Quick actions (phones and tablets) + key facts */}
      <div className="max-w-6xl mx-auto px-4 pt-5">
        <div className="lg:hidden mb-5">
          <ContactButtons
            venue={venue}
            waLink={waLink}
            onSendInquiry={openInquiry}
            whatsappLabel={whatsappLabel.replace(" Now", "")}
            inquiryLabel={inquiryLabel}
          />
        </div>

        {statItems.length > 0 && (
          <div className={`grid grid-cols-2 ${mdCols} gap-3 mb-6`}>
            {statItems.map((s, i) => (
              <StatCard
                key={s.label}
                icon={s.icon}
                label={s.label}
                value={s.value}
                tint={STAT_TINTS[i % STAT_TINTS.length]}
                index={i}
                spanOnMobile={statItems.length % 2 === 1 && i === statItems.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      <SectionNav items={tabs} />

      <div className="max-w-6xl mx-auto px-4 pt-6 pb-28 lg:pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_370px] gap-6 lg:gap-8 items-start">

          {/* ============================ MAIN COLUMN ============================ */}
          <div className="space-y-6 min-w-0">

            {hasOverview && (
              <SectionCard id="sec-overview" icon={Info} title="About this business">
                <div className="space-y-5">
                  {venue.specialty_tagline && (
                    <div className="relative bg-gradient-to-r from-gold-400/15 to-transparent border-l-4 border-gold-500 rounded-r-2xl px-5 py-4">
                      <Quote size={22} className="absolute top-3 right-4 text-gold-500/40" />
                      <p className="text-navy-800 text-[15px] font-semibold italic pr-8">{venue.specialty_tagline}</p>
                    </div>
                  )}

                  {venue.long_description && <ExpandableText text={venue.long_description} />}

                  {highlights.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {highlights.map((h) => (
                        <span
                          key={h}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-full"
                        >
                          <ShieldCheck size={13} /> {h}
                        </span>
                      ))}
                    </div>
                  )}

                  {hasLinks && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {venue.instagram_handle && (
                        <LinkPill
                          href={`https://instagram.com/${venue.instagram_handle.replace("@", "")}`}
                          icon={<InstagramIcon />}
                          label="Instagram"
                          tone="pink"
                        />
                      )}
                      {venue.youtube_channel_link && (
                        <LinkPill href={venue.youtube_channel_link} icon={<YoutubeIcon />} label="YouTube" tone="red" />
                      )}
                      {brandedWebsiteUrl && (
                        <LinkPill href={brandedWebsiteUrl} icon={<Globe size={15} />} label="Website" />
                      )}
                      {ownWebsiteUrl && ownWebsiteUrl !== brandedWebsiteUrl && (
                        <LinkPill
                          href={ownWebsiteUrl}
                          icon={<Globe size={15} />}
                          label={brandedWebsiteUrl ? "Official Site" : "Website"}
                        />
                      )}
                      {venue.video_intro_url && (
                        videoEmbed ? (
                          <LinkPill
                            onClick={() => setShowVideo(true)}
                            icon={<PlayCircle size={15} />}
                            label="Watch Intro Video"
                            tone="accent"
                          />
                        ) : (
                          <LinkPill
                            href={venue.video_intro_url}
                            icon={<PlayCircle size={15} />}
                            label="Watch Intro Video"
                            tone="accent"
                          />
                        )
                      )}
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {hasPlans && (
              <div id="sec-plans" className="scroll-mt-36 space-y-6">
                {/* Vertical-specific live data (gym plans, menu, library shifts, catalogs) */}
                <LiveSections live={live} schema={schema} attrs={attrs} />

                {hasPricing && (
                  <SectionCard icon={Wallet} title="Pricing">
                    {venue.pricing_mode === "per_service" && venue.service_prices && Object.keys(venue.service_prices).length > 0 ? (
                      <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden mb-4">
                        {Object.entries(venue.service_prices).map(([service, price]) =>
                          price ? (
                            <div key={service} className="flex justify-between items-center text-sm px-4 py-3 odd:bg-gray-50/60">
                              <span className="text-gray-600">{service}</span>
                              <span className="font-bold text-navy-900">₹{Number(price).toLocaleString("en-IN")}</span>
                            </div>
                          ) : null
                        )}
                      </div>
                    ) : (
                      (venue.starting_price || venue.maximum_price) && (
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-700 to-navy-900 text-white p-5 mb-4 flex items-center gap-8 flex-wrap">
                          <div className="absolute -top-10 -right-8 w-36 h-36 rounded-full bg-gold-500/25 blur-3xl pointer-events-none" />
                          {venue.starting_price && (
                            <div className="relative">
                              <p className="text-xs text-white/60 mb-1">{L.price || "Starting from"}</p>
                              <p className="font-display font-extrabold text-3xl text-gold-400">
                                ₹{Number(venue.starting_price).toLocaleString("en-IN")}
                                {unit && <span className="text-sm font-medium text-white/60"> {unit}</span>}
                              </p>
                            </div>
                          )}
                          {venue.maximum_price && (
                            <div className="relative">
                              <p className="text-xs text-white/60 mb-1">{L.priceMax || "Up to"}</p>
                              <p className="font-display font-extrabold text-3xl text-white">
                                ₹{Number(venue.maximum_price).toLocaleString("en-IN")}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    )}

                    {venue.pricing_note && (
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-3">
                        {venue.pricing_note}
                      </p>
                    )}

                    {(venue.advance_payment_percentage || venue.cancellation_policy) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {venue.advance_payment_percentage && (
                          <div className="bg-gray-50 rounded-2xl px-4 py-3">
                            <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-400">Advance required</p>
                            <p className="text-sm font-bold text-navy-900 mt-1">{venue.advance_payment_percentage}%</p>
                          </div>
                        )}
                        {venue.cancellation_policy && (
                          <div className="bg-gray-50 rounded-2xl px-4 py-3">
                            <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-400">
                              {L.policy || "Cancellation policy"}
                            </p>
                            <p className="text-sm font-bold text-navy-900 mt-1">{venue.cancellation_policy}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </SectionCard>
                )}

                {/* Availability calendar: only for plans with the "slots" feature.
                    The calendar's "send inquiry" action is only wired up when the plan
                    also allows inquiries. */}
                {hasAvailability && (
                  <AvailabilityCalendar
                    venueId={venue.id}
                    onSendInquiry={canInquire ? (date) => { setInquiryDate(date); setShowInquiry(true); } : undefined}
                  />
                )}
              </div>
            )}

            {hasDetails && (
              <div id="sec-details" className="scroll-mt-36 space-y-6">
                {venue.marketplace_services?.length > 0 && (
                  <SectionCard icon={Sparkles} title={L.services || "Services & Amenities"}>
                    <ServicesGrid services={venue.marketplace_services} />
                  </SectionCard>
                )}

                {/* Category specific details (course info, cuisines, facilities, ...) */}
                <ProfileAttributes schema={schema} values={attrs} />

                {L.highlights && venue.famous_events_handled && (
                  <SectionCard icon={Sparkles} title={L.highlights}>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{venue.famous_events_handled}</p>
                  </SectionCard>
                )}

                {venue.awards_recognition && (
                  <SectionCard icon={Award} title={L.achievements || "Awards & Recognition"}>
                    <div className="flex items-start gap-3 bg-gold-400/10 border border-gold-400/30 rounded-2xl p-4">
                      <Award size={20} className="text-gold-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700 leading-relaxed">{venue.awards_recognition}</p>
                    </div>
                  </SectionCard>
                )}
              </div>
            )}

            <PhotoGallery gallery={venue.gallery} />

            {canShowReviews && <ReviewsSection venueId={venue.id} />}

            <SectionCard id="sec-location" icon={MapPin} title="Location & service area">
              <p className="text-sm text-gray-600 mb-4">
                {[venue.address, venue.primary_locality, venue.city].filter(Boolean).join(", ")}
                {venue.full_pincode && ` - ${venue.full_pincode}`}
              </p>

              {embedUrl && (
                <div className="rounded-2xl overflow-hidden border border-gray-100 mb-4">
                  <iframe
                    src={embedUrl}
                    title={`${venue.hall_name} location`}
                    className="w-full border-0 block h-60 md:h-72"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}

              <a
                href={mapsOpenUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 hover:-translate-y-0.5 transition-all"
              >
                <Navigation size={15} /> Get directions <ArrowUpRight size={14} />
              </a>

              {(venue.serviceAreas?.length > 0 || venue.service_travel_note) && (
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-400 mb-2.5">Service areas</p>
                  {venue.serviceAreas?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {venue.serviceAreas.map((c) => (
                        <span key={c.id} className="text-xs font-medium bg-navy-50 text-navy-700 px-3 py-1.5 rounded-full border border-navy-100">
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {venue.service_travel_note && (
                    <p className="text-sm text-gray-500 leading-relaxed">{venue.service_travel_note}</p>
                  )}
                </div>
              )}
            </SectionCard>
          </div>

          {/* ============================== SIDEBAR ============================== */}
          <aside className="space-y-5 lg:sticky lg:top-[136px] lg:self-start lg:max-h-[calc(100vh-152px)] lg:overflow-y-auto no-scrollbar lg:-mx-1 lg:px-1 lg:pb-1">
            <div className="hidden lg:block">
              <ContactCard
                venue={venue}
                waLink={waLink}
                onSendInquiry={openInquiry}
                priceText={priceText}
                priceLabel={L.price || "Starting from"}
                websiteUrl={brandedWebsiteUrl}
                whatsappLabel={whatsappLabel}
                inquiryLabel={inquiryLabel}
              />
            </div>

            <BusinessHoursCard hours={venue.business_hours} />

            <div className="bg-white border border-gray-100 rounded-3xl shadow-[0_1px_2px_rgba(11,14,28,0.04),0_10px_28px_-14px_rgba(11,14,28,0.10)] p-5">
              <h3 className="font-display font-bold text-navy-900 mb-4 flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck size={17} />
                </span>
                Why trust this listing
              </h3>
              <div className="space-y-3">
                {trustRows.map(({ icon: Icon, tint, text }) => (
                  <div key={text} className="flex items-center gap-3 text-sm text-gray-600">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tint}`}>
                      <Icon size={15} />
                    </span>
                    {text}
                  </div>
                ))}
              </div>
            </div>

            <a
              href={`${APP_URL}/login`}
              className="group flex items-center justify-between gap-3 rounded-3xl bg-navy-50 border border-navy-100 px-5 py-4 hover:bg-navy-100 transition-colors"
            >
              <div>
                <p className="font-display font-bold text-navy-900 text-sm">Is this your business?</p>
                <p className="text-xs text-gray-500 mt-0.5">Manage your listing for free</p>
              </div>
              <ArrowUpRight size={18} className="text-navy-700 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </aside>
        </div>

        <SimilarVendors vendors={similar_vendors} city={venue.city} category={category} />
      </div>

      <MobileActionBar
        venue={venue}
        waLink={waLink}
        onSendInquiry={openInquiry}
        priceText={venue.starting_price ? priceText : ""}
      />

      {canInquire && showInquiry && (
        <InquiryModal
          venue={venue}
          initialDate={inquiryDate}
          slotsEnabled={!!planFeatures.slots}
          vertical={vertical}
          businessType={schema?.business_type}
          onClose={() => { setShowInquiry(false); setInquiryDate(""); }}
        />
      )}

      {showVideo && videoEmbed && (
        <VideoModal
          embed={videoEmbed}
          title={`${venue.hall_name} intro video`}
          onClose={() => setShowVideo(false)}
        />
      )}

      <VendorCTAPrompt />
    </>
  );
}