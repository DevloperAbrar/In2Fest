import React from "react";
import { motion } from "framer-motion";
import { MapPin, BadgeCheck, Crown } from "lucide-react";
import StarRating from "../common/StarRating";
import Badge from "../common/Badge";
import { getImageUrl } from "../../lib/constants";

function TrustBar({ venue }) {
  const badges = [
    venue.badge_verified_business && "verified_business",
    venue.badge_documents_verified && "documents_verified",
    venue.badge_premium_partner && "premium_partner",
  ].filter(Boolean);

  if (!badges.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-5 pt-5 border-t border-gray-100">
      <span className="text-xs text-gray-400 mr-1 flex items-center gap-1">
        <BadgeCheck size={13} className="text-gray-400" />
        Verified by In2Fest
      </span>
      {badges.map((type) => (
        <Badge key={type} type={type} variant="pill" />
      ))}
    </div>
  );
}

export default function HeroSection({ venue }) {
  const imageUrl = getImageUrl(venue.hero_image_url);

  return (
    <div className="relative">
      {/* Cover image */}
      <div className="relative h-72 md:h-[26rem] bg-navy-800 overflow-hidden">
        {imageUrl ? (
          <motion.img
            src={imageUrl}
            alt={venue.hall_name}
            className="w-full h-full object-cover"
            initial={{ scale: 1.08, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-navy-700 to-navy-900 flex items-center justify-center">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="text-white/20">
              <path d="M3 21V9l9-7 9 7v12H3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="currentColor" opacity="0.3" />
              <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        {/* Gradient wash so the floating card and any overlay text stay legible */}
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/85 via-navy-900/10 to-transparent" />

        {venue.badge_premium_partner && (
          <div className="absolute top-5 left-5">
            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-gold-500 to-gold-400 text-navy-900 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg">
              <Crown size={13} />
              Premium Partner
            </span>
          </div>
        )}
      </div>

      {/* Info card */}
      <div className="max-w-6xl mx-auto px-4 -mt-16 md:-mt-20 relative z-10">
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(11,14,28,0.12)] p-5 md:p-7"
        >
          <p className="text-xs uppercase tracking-wide text-accent-600 font-semibold mb-1.5">
            {venue.business_category?.replace(/-/g, " ")}
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-[1.85rem] font-display font-bold text-navy-900 leading-tight">
              {venue.hall_name}
            </h1>
            {venue.badge_verified_business && (
              <BadgeCheck size={20} className="text-blue-500 flex-shrink-0" aria-label="Verified business" />
            )}
          </div>

          {(venue.primary_locality || venue.city) && (
            <p className="text-sm text-gray-500 mt-1.5 flex items-center gap-1.5">
              <MapPin size={14} className="text-gray-400 flex-shrink-0" />
              {venue.primary_locality ? `${venue.primary_locality}, ` : ""}{venue.city}
            </p>
          )}

          <div className="mt-2.5">
            <StarRating rating={venue.average_rating} reviewCount={venue.review_count} />
          </div>

          <TrustBar venue={venue} />
        </motion.div>
      </div>
    </div>
  );
}