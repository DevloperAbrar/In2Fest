import React from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import StarRating from "../common/StarRating";
import Badge from "../common/Badge";
import PriceRange from "../common/PriceRange";
import { slugify } from "../../lib/seoHelpers";
import { getImageUrl } from "../../lib/constants";
import { getCategoryLabel } from "../common/CategoryIcon";

// Premium ribbon SVG  - sits on the image corner
function PremiumRibbon() {
  return (
    <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 7L7 17H17L21 7L16 11L12 4L8 11L3 7Z"
          fill="white"
          opacity="0.9"
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M7 20h10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      Premium
    </span>
  );
}

export default function VendorCard({ vendor }) {
  if (!vendor.business_category) return null;

  const url = `/${slugify(vendor.city)}/${vendor.business_category}/${vendor.subdomain}`;
  const imageUrl = getImageUrl(vendor.hero_image_url);

  const hasVerified = vendor.badge_verified_business || vendor.badge_documents_verified;

  return (
    <Link
      to={url}
      className="group block bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 hover:border-gray-200 transition-all duration-300"
    >
      {/* Image */}
      <div className="relative h-44 bg-gray-100 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={vendor.hall_name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#1a2035,#2d3a5e)" }}
          >
            <span className="text-white/40 text-3xl font-display font-bold">
              {vendor.hall_name?.[0]}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
        {vendor.badge_premium_partner && <PremiumRibbon />}
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-1.5">
        {/* Name row + trust chip icons */}
        <div className="flex items-start justify-between gap-2">
          <p className="font-display font-bold text-navy-900 text-sm leading-snug truncate flex-1">
            {vendor.hall_name}
          </p>
          {hasVerified && (
            <div className="flex gap-1 flex-shrink-0 mt-0.5">
              {vendor.badge_verified_business && (
                <Badge type="verified_business" variant="chip" />
              )}
              {vendor.badge_documents_verified && (
                <Badge type="documents_verified" variant="chip" />
              )}
            </div>
          )}
        </div>

        <p className="flex items-center gap-1 text-xs text-gray-500">
          {getCategoryLabel(vendor.business_category)}
          <span className="text-gray-300">·</span>
          <MapPin size={11} className="text-gray-300" /> {vendor.city}
        </p>

        <StarRating rating={vendor.average_rating} reviewCount={vendor.review_count} />

        {vendor.starting_price ? (
          <PriceRange min={vendor.starting_price} size="sm" showRange={false} />
        ) : (
          <p className="text-sm text-gray-400">Price on request</p>
        )}

        {/* Service tags */}
        {(vendor.marketplace_services || []).length > 0 && (
          <div className="flex gap-1 flex-wrap pt-0.5">
            {vendor.marketplace_services.map((s) => (
              <span
                key={s}
                className="text-[11px] bg-gray-50 text-gray-500 border border-gray-100 px-2 py-0.5 rounded-full"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}