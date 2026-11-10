import React, { useMemo, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MapPin, BadgeCheck, Crown, Images, Star, Sparkles, CalendarDays } from "lucide-react";
import Badge from "../common/Badge";
import { getImageUrl } from "../../lib/constants";
import { getBusinessLabel } from "../../lib/businessLabel";
import { slugify } from "../../lib/seoHelpers";
import { Lightbox } from "./PhotoGallery";
import SaveButton from "./SaveButton";
import { ShareButton } from "./ProfileKit";

const EASE = [0.22, 1, 0.36, 1];

// Desktop mosaic: how many thumbnails sit next to the big photo
function mainClasses(thumbs) {
  if (thumbs === 0) return "col-span-4 row-span-2";
  if (thumbs === 1) return "col-span-3 row-span-2";
  return "col-span-2 row-span-2";
}
function thumbClasses(thumbs, i) {
  if (thumbs === 1) return "col-span-1 row-span-2";
  if (thumbs === 2) return "col-span-2 row-span-1";
  if (thumbs === 3) return i === 0 ? "col-span-2 row-span-1" : "col-span-1 row-span-1";
  return "col-span-1 row-span-1";
}

function TrustBar({ venue }) {
  const badges = [
    venue.badge_verified_business && "verified_business",
    venue.badge_documents_verified && "documents_verified",
    venue.badge_premium_partner && "premium_partner",
  ].filter(Boolean);

  if (!badges.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-4">
      {badges.map((type) => (
        <Badge key={type} type={type} variant="pill" />
      ))}
    </div>
  );
}

function RatingPill({ venue }) {
  const count = Number(venue.review_count || 0);

  if (count >= 3 && venue.average_rating) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-sm font-bold px-2.5 py-1 rounded-lg">
          {Number(venue.average_rating).toFixed(1)}
          <Star size={12} className="fill-white" />
        </span>
        <span className="text-sm text-gray-500">{count} reviews</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-gold-400/20 text-gold-600 px-2.5 py-1.5 rounded-lg">
      <Sparkles size={13} /> New listing
    </span>
  );
}

function StatusPill({ status }) {
  if (!status) return null;
  return (
    <span
      className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border ${
        status.open
          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
          : "bg-rose-50 text-rose-600 border-rose-100"
      }`}
    >
      <span className="relative flex w-2 h-2">
        {status.open && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
        )}
        <span className={`relative inline-flex rounded-full w-2 h-2 ${status.open ? "bg-emerald-500" : "bg-rose-500"}`} />
      </span>
      {status.text}
    </span>
  );
}

export default function HeroSection({ venue, showRating = true, status = null }) {
  const [lightbox, setLightbox] = useState(null);
  const [slide, setSlide] = useState(0);
  const scroller = useRef(null);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  const images = useMemo(() => {
    const hero = getImageUrl(venue.hero_image_url);
    const gallery = (venue.gallery || []).map((g) => getImageUrl(g?.url || g));
    return [hero, ...gallery].filter(Boolean).filter((u, i, a) => a.indexOf(u) === i);
  }, [venue.hero_image_url, venue.gallery]);

  const thumbs = images.slice(1, 5);
  const typeLabel = getBusinessLabel(venue);
  const typeSlug = venue.business_types_resolved?.[0]?.slug;

  const onScroll = () => {
    const el = scroller.current;
    if (!el || !el.clientWidth) return;
    setSlide(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div>
      {/* ---------------------------- Media ---------------------------- */}
      <div className="relative max-w-6xl mx-auto md:px-4 md:pt-4">
        {images.length > 0 ? (
          <>
            {/* Mobile: swipe carousel */}
            <div className="md:hidden relative">
              <div
                ref={scroller}
                onScroll={onScroll}
                className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar bg-navy-800"
              >
                {images.map((u, i) => (
                  <button
                    key={u + i}
                    type="button"
                    onClick={() => setLightbox(i)}
                    className="relative flex-none w-full h-72 snap-center"
                    aria-label={`Open photo ${i + 1}`}
                  >
                    <img
                      src={u}
                      alt={i === 0 ? venue.hall_name : `${venue.hall_name} photo ${i + 1}`}
                      className="w-full h-full object-cover"
                      loading={i === 0 ? "eager" : "lazy"}
                    />
                  </button>
                ))}
              </div>
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-navy-900/60 to-transparent pointer-events-none" />
              <span className="absolute bottom-8 right-4 inline-flex items-center gap-1.5 bg-navy-900/70 backdrop-blur text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                <Images size={13} /> {slide + 1} / {images.length}
              </span>
            </div>

            {/* Desktop: mosaic */}
            <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[26rem] lg:h-[28rem] rounded-3xl overflow-hidden">
              <button
                type="button"
                onClick={() => setLightbox(0)}
                className={`relative group overflow-hidden bg-navy-800 ${mainClasses(thumbs.length)}`}
                aria-label="Open main photo"
              >
                <motion.img
                  src={images[0]}
                  alt={venue.hall_name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  initial={{ scale: 1.08, opacity: 0.7 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 1.2, ease: EASE }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-900/35 via-transparent to-transparent" />
              </button>

              {thumbs.map((u, i) => {
                const isLast = i === thumbs.length - 1 && images.length > 5;
                return (
                  <button
                    key={u + i}
                    type="button"
                    onClick={() => setLightbox(i + 1)}
                    className={`relative group overflow-hidden bg-navy-800 ${thumbClasses(thumbs.length, i)}`}
                    aria-label={`Open photo ${i + 2}`}
                  >
                    <img
                      src={u}
                      alt={`${venue.hall_name} photo ${i + 2}`}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-navy-900/0 group-hover:bg-navy-900/15 transition-colors" />
                    {isLast && (
                      <div className="absolute inset-0 bg-navy-900/60 flex items-center justify-center text-white font-display font-bold text-lg">
                        +{images.length - 5}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {images.length > 1 && (
              <button
                type="button"
                onClick={() => setLightbox(0)}
                className="hidden md:inline-flex absolute bottom-8 right-8 items-center gap-2 bg-white/95 backdrop-blur text-navy-900 text-sm font-semibold px-4 py-2 rounded-xl shadow-lg hover:bg-white hover:-translate-y-0.5 transition-all"
              >
                <Images size={15} /> Show all {images.length} photos
              </button>
            )}
          </>
        ) : (
          <div className="h-56 md:h-72 md:rounded-3xl bg-gradient-to-br from-navy-700 to-navy-900 flex items-center justify-center">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="text-white/20">
              <path d="M3 21V9l9-7 9 7v12H3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="currentColor" opacity="0.3" />
              <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        {venue.badge_premium_partner && (
          <span className="absolute top-3 left-3 md:top-8 md:left-8 inline-flex items-center gap-1.5 bg-gradient-to-r from-gold-500 to-gold-400 text-navy-900 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg">
            <Crown size={13} /> Premium Partner
          </span>
        )}

        <div className="absolute top-3 right-3 md:top-8 md:right-8 flex items-center gap-2">
          <ShareButton title={venue.hall_name} variant="glass" />
          <SaveButton venue={venue} variant="glass" />
        </div>
      </div>

      {/* --------------------------- Identity --------------------------- */}
      <div className="relative -mt-5 md:mt-7 bg-white md:bg-transparent rounded-t-3xl md:rounded-none">
        <div className="max-w-6xl mx-auto px-4 pt-5 md:pt-0">
          <motion.div
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.1, ease: EASE }}
          >
            <p className="text-xs uppercase tracking-wider text-accent-600 font-bold mb-2">
              {typeLabel && typeSlug ? (
                <Link
                  to={`/${slugify(venue.city || "")}/${venue.business_category}/${typeSlug}`}
                  className="hover:underline"
                >
                  {typeLabel}
                </Link>
              ) : (
                typeLabel || venue.business_category?.replace(/-/g, " ")
              )}
            </p>

            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl md:text-4xl font-display font-extrabold text-navy-900 leading-tight tracking-tight">
                {venue.hall_name}
              </h1>
              {venue.badge_verified_business && (
                <BadgeCheck size={26} className="text-blue-500 flex-shrink-0" aria-label="Verified business" />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 mt-3.5">
              {showRating && <RatingPill venue={venue} />}
              {(venue.primary_locality || venue.city) && (
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                  <MapPin size={15} className="text-accent-500 flex-shrink-0" />
                  {venue.primary_locality ? `${venue.primary_locality}, ` : ""}
                  {venue.city}
                </span>
              )}
              {venue.year_established && (
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                  <CalendarDays size={15} className="text-gray-400" /> Since {venue.year_established}
                </span>
              )}
              <StatusPill status={status} />
            </div>

            <TrustBar venue={venue} />
          </motion.div>
        </div>
      </div>

      <Lightbox urls={images} index={lightbox} onClose={closeLightbox} onIndex={setLightbox} />
    </div>
  );
}