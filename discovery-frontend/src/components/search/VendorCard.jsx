import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Star, BadgeCheck, Crown, Globe, MessageCircle, ArrowUpRight } from "lucide-react";
import PriceRange from "../common/PriceRange";
import { slugify } from "../../lib/seoHelpers";
import { getImageUrl, BASE_DOMAIN } from "../../lib/constants";
import { getCategoryLabel } from "../common/CategoryIcon";
import { getBusinessLabel } from "../../lib/businessLabel";

function Placeholder({ name }) {
  return (
    <div className="w-full h-full relative flex items-center justify-center bg-gradient-to-br from-navy-700 to-navy-800 overflow-hidden">
      <svg className="absolute -right-6 -bottom-4 opacity-90" width="150" height="75" viewBox="0 0 220 110" aria-hidden="true">
        <path d="M10 110 a100 100 0 0 1 200 0" fill="none" stroke="#f5a623" strokeWidth="18" strokeLinecap="round" />
        <path d="M42 110 a68 68 0 0 1 136 0" fill="none" stroke="#e8192c" strokeWidth="18" strokeLinecap="round" />
        <path d="M74 110 a36 36 0 0 1 72 0" fill="none" stroke="#ffffff" strokeWidth="18" strokeLinecap="round" />
      </svg>
      <span className="relative text-white/80 text-5xl font-display font-extrabold">{name?.[0]?.toUpperCase()}</span>
    </div>
  );
}

function whatsappHref(vendor) {
  const raw = String(vendor.whatsapp_number || vendor.whatsapp || "").replace(/\D/g, "");
  if (raw.length < 10) return null;
  const num = raw.length === 10 ? `91${raw}` : raw;
  return `https://wa.me/${num}`;
}

function websiteHref(vendor) {
  const ext = String(vendor.external_website || "").trim();
  if (ext) return /^https?:\/\//i.test(ext) ? ext : `https://${ext}`;
  if (vendor.has_website && vendor.subdomain) return `https://${vendor.subdomain}.${BASE_DOMAIN}`;
  return null;
}

export default function VendorCard({ vendor }) {
  if (!vendor.business_category) return null;

  const url = `/${slugify(vendor.city)}/${vendor.business_category}/${vendor.subdomain}`;
  const imageUrl = getImageUrl(vendor.hero_image_url);
  const verified = vendor.badge_verified_business || vendor.badge_documents_verified;
  const rated = Number(vendor.review_count) >= 3;
  const siteHref = websiteHref(vendor);
  const waHref = whatsappHref(vendor);
  const label = getBusinessLabel(vendor) || getCategoryLabel(vendor.business_category);
  const tags = vendor.card_tags || [];
  const services = vendor.marketplace_services || [];

  return (
    <article className="group relative flex flex-col h-full bg-white rounded-3xl border border-navy-100 overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-navy-200 hover:shadow-[0_28px_50px_-28px_rgba(26,32,53,0.5)]">
      {/* Whole card is clickable; action buttons sit above this link */}
      <Link to={url} aria-label={`View ${vendor.hall_name}`} className="absolute inset-0 z-10" />

      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-navy-50">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={vendor.hall_name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <Placeholder name={vendor.hall_name} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy-800/55 via-transparent to-transparent pointer-events-none" />

        {vendor.badge_premium_partner && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-gold-500 px-2.5 py-1 text-[11px] font-extrabold text-navy-700 shadow-md">
            <Crown size={12} strokeWidth={2.6} /> Premium
          </span>
        )}

        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-extrabold text-navy-700 shadow-md">
          {rated ? (
            <>
              <Star size={12} className="fill-gold-500 text-gold-500" /> {Number(vendor.average_rating).toFixed(1)}
              <span className="font-medium text-navy-300">({vendor.review_count})</span>
            </>
          ) : (
            <span className="text-emerald-600">New</span>
          )}
        </span>

        <span className="absolute bottom-3 left-3 max-w-[80%] truncate rounded-full bg-white/90 backdrop-blur px-3 py-1 text-[11px] font-bold text-navy-600">
          {label}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-start gap-2">
          <h3 className="flex-1 font-display font-extrabold text-navy-700 text-[15px] leading-snug line-clamp-2">
            {vendor.hall_name}
          </h3>
          {verified && <BadgeCheck size={18} className="flex-shrink-0 mt-0.5 text-emerald-500" aria-label="Verified" />}
        </div>

        <p className="mt-1 flex items-center gap-1 text-xs text-navy-400">
          <MapPin size={12} className="text-accent-500 flex-shrink-0" />
          <span className="truncate">{[vendor.primary_locality, vendor.city].filter(Boolean).join(", ")}</span>
        </p>

        {vendor.specialty_tagline && (
          <p className="mt-2 text-[13px] text-navy-500 leading-snug line-clamp-2">{vendor.specialty_tagline}</p>
        )}

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-[#FFF6E8] border border-gold-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-navy-600">
                {t}
              </span>
            ))}
          </div>
        )}

        {services.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {services.slice(0, 3).map((s) => (
              <span key={s} className="rounded-full bg-navy-50 px-2.5 py-0.5 text-[11px] text-navy-500">{s}</span>
            ))}
            {services.length > 3 && (
              <span className="rounded-full bg-navy-50 px-2.5 py-0.5 text-[11px] font-bold text-navy-400">+{services.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer: price + actions */}
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between gap-2 border-t border-dashed border-navy-100 pt-3">
            <div className="min-w-0">
              {vendor.starting_price ? (
                <PriceRange min={vendor.starting_price} size="sm" showRange={false} />
              ) : (
                <p className="text-sm font-semibold text-navy-300">Price on request</p>
              )}
            </div>

            <div className="relative z-20 flex items-center gap-1.5 flex-shrink-0">
              {siteHref && (
                <a
                  href={siteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${vendor.hall_name} website`}
                  className="inline-flex items-center gap-1 rounded-full border-2 border-navy-100 px-2.5 py-1.5 text-[11px] font-extrabold text-navy-600 hover:border-navy-700 hover:bg-navy-700 hover:text-white transition-colors"
                >
                  <Globe size={13} /> Website
                </a>
              )}
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`WhatsApp ${vendor.hall_name}`}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-[#25D366] text-white hover:brightness-95 transition"
                >
                  <MessageCircle size={15} />
                </a>
              )}
              <span className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-accent-500 text-white transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowUpRight size={15} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}