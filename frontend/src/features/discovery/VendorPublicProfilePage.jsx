import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../services/api";
import Loader from "../../components/common/Loader";
import {
  MapPin, Phone, Instagram, Youtube, Globe, CheckCircle2,
  Award, Users, Calendar, Languages, Star, ChevronRight,
  Banknote, ShieldCheck, MessageCircle, ExternalLink, Copy
} from "lucide-react";
import { showSuccess } from "../../components/common/Toast";

function InfoBadge({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col items-center justify-center bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
      <Icon size={18} className="text-primary-500 mb-1" />
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function VendorPublicProfilePage() {
  const { city, category, vendor } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/discovery/vendor/${city}/${category}/${vendor}`)
      .then((res) => setData(res.data.data))
      .catch(() => setError("Vendor not found or not listed on marketplace yet."))
      .finally(() => setLoading(false));
  }, [city, category, vendor]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-gray-50">
        <p className="text-2xl font-semibold text-gray-700 mb-2">Profile not found</p>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    );
  }

  const { venue, similar_vendors } = data;
  const categoryLabel = category.replace(/-/g, " ");
  const cityLabel = city.replace(/-/g, " ");

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    showSuccess("Copied to clipboard");
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ── */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-8">

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs text-gray-400 mb-4 capitalize">
            <span>Home</span>
            <ChevronRight size={12} />
            <span>{cityLabel}</span>
            <ChevronRight size={12} />
            <span>{categoryLabel}</span>
            <ChevronRight size={12} />
            <span className="text-gray-600 font-medium">{venue.hall_name}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full mb-3">
                {categoryLabel}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{venue.hall_name}</h1>

              <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-2">
                <MapPin size={14} className="text-primary-400" />
                <span>
                  {venue.primary_locality ? `${venue.primary_locality}, ` : ""}{venue.city}
                  {venue.full_pincode ? `  - ${venue.full_pincode}` : ""}
                </span>
              </div>

              {venue.specialty_tagline && (
                <p className="text-primary-700 text-sm font-medium italic mt-1">
                  "{venue.specialty_tagline}"
                </p>
              )}
            </div>

            {/* Rating placeholder */}
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-3 py-2 rounded-xl self-start">
              <Star size={14} className="text-yellow-500 fill-yellow-400" />
              <span className="text-sm font-semibold text-gray-700">New listing</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <InfoBadge icon={Banknote} label="Starting Price" value={venue.starting_price ? `₹${Number(venue.starting_price).toLocaleString("en-IN")}` : null} />
            <InfoBadge icon={Users} label="Team Size" value={venue.team_size ? `${venue.team_size} members` : null} />
            <InfoBadge icon={Calendar} label="Est." value={venue.year_established || null} />
            <InfoBadge icon={Languages} label="Languages" value={venue.languages_spoken?.length ? venue.languages_spoken.join(", ") : null} />
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-3 mt-6">
            {venue.whatsapp_number && (
              
           <a     href={`https://wa.me/${venue.whatsapp_number.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
              >
                <MessageCircle size={16} /> WhatsApp
              </a>
            )}
            {venue.instagram_handle && (
              
             <a   href={`https://instagram.com/${venue.instagram_handle.replace("@", "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                <Instagram size={16} /> Instagram
              </a>
            )}
            {venue.youtube_channel_link && (
              
            <a    href={venue.youtube_channel_link}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                <Youtube size={16} /> YouTube
              </a>
            )}
            {venue.external_website && (
              
            <a    href={venue.external_website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                <Globe size={16} /> Website
              </a>
            )}
            {venue.video_intro_url && (
              
              <a  href={venue.video_intro_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 border border-primary-200 text-primary-700 hover:bg-primary-50 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                <ExternalLink size={16} /> Watch Intro Video
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT  - main content */}
          <div className="lg:col-span-2 space-y-6">

            {/* About */}
            {venue.long_description && (
              <SectionCard title="About">
                <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                  {venue.long_description}
                </p>
              </SectionCard>
            )}

            {/* Services */}
            {venue.marketplace_services?.length > 0 && (
              <SectionCard title="Services & Amenities">
                <div className="grid grid-cols-2 gap-2">
                  {venue.marketplace_services.map((s) => (
                    <div key={s} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                      <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                      {s}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Pricing */}
            {(venue.starting_price || venue.pricing_mode === "per_service") && (
              <SectionCard title="Pricing">
                {venue.pricing_mode === "per_service" && venue.service_prices && Object.keys(venue.service_prices).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(venue.service_prices).map(([service, price]) =>
                      price ? (
                        <div key={service} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                          <span className="text-gray-600">{service}</span>
                          <span className="font-semibold text-gray-900">₹{Number(price).toLocaleString("en-IN")}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-6">
                    {venue.starting_price && (
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Starting from</p>
                        <p className="text-2xl font-bold text-primary-700">₹{Number(venue.starting_price).toLocaleString("en-IN")}</p>
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
                  <p className="mt-3 text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    {venue.pricing_note}
                  </p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-3">
                  {venue.advance_payment_percentage && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
                      <p className="text-xs text-gray-400">Advance required</p>
                      <p className="font-semibold text-gray-700">{venue.advance_payment_percentage}%</p>
                    </div>
                  )}
                  {venue.cancellation_policy && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
                      <p className="text-xs text-gray-400">Cancellation policy</p>
                      <p className="font-semibold text-gray-700">{venue.cancellation_policy}</p>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Famous events */}
            {venue.famous_events_handled && (
              <SectionCard title="Notable Events Handled">
                <p className="text-sm text-gray-600 leading-relaxed">{venue.famous_events_handled}</p>
              </SectionCard>
            )}

            {/* Awards */}
            {venue.awards_recognition && (
              <SectionCard title="Awards & Recognition">
                <div className="flex items-start gap-3">
                  <Award size={18} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600 leading-relaxed">{venue.awards_recognition}</p>
                </div>
              </SectionCard>
            )}

            {/* Similar Vendors */}
            {similar_vendors?.length > 0 && (
              <SectionCard title={`Similar vendors in ${venue.city}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {similar_vendors.map((v) => (
                    
                   <a   key={v.id}
                      href={`/${city}/${category}/${v.subdomain}`}
                      className="flex items-start gap-3 border border-gray-100 rounded-xl p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-600 font-bold text-sm">{v.hall_name?.[0]}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-800">{v.hall_name}</p>
                        <p className="text-xs text-gray-400">{v.city}</p>
                        {v.starting_price && (
                          <p className="text-xs text-primary-600 font-medium mt-0.5">
                            From ₹{Number(v.starting_price).toLocaleString("en-IN")}
                          </p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          {/* RIGHT  - sidebar */}
          <div className="space-y-6">

            {/* Contact card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Get in touch</h3>
              {venue.whatsapp_number && (
                
                 <a href={`https://wa.me/${venue.whatsapp_number.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors justify-center"
                >
                  <MessageCircle size={15} /> WhatsApp Now
                </a>
              )}
              {venue.whatsapp_number && (
                <button
                  onClick={() => copyText(venue.whatsapp_number)}
                  className="flex items-center gap-2 w-full border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors justify-center"
                >
                  <Copy size={14} /> Copy Number
                </button>
              )}
            </div>

            {/* Service areas */}
            {(venue.serviceAreas?.length > 0 || venue.service_travel_note) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Service Areas</h3>
                {venue.serviceAreas?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {venue.serviceAreas.map((c) => (
                      <span key={c.id} className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full border border-primary-100">
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

            {/* Trust signals */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Why trust this listing</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <ShieldCheck size={14} className="text-green-500" /> Verified on VenIn2Fest
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
                    <Users size={14} className="text-orange-400" /> Team of {venue.team_size}
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            {venue.city && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Location</h3>
                <p className="text-xs text-gray-500 mb-3">
                  {venue.primary_locality && `${venue.primary_locality}, `}{venue.city}
                  {venue.full_pincode && `  - ${venue.full_pincode}`}
                </p>
                
                <a  href={`https://www.google.com/maps/search/${encodeURIComponent(`${venue.hall_name} ${venue.city}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary-600 hover:underline font-medium"
                >
                  <MapPin size={13} /> View on Google Maps
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dev note */}
      <div className="text-center text-xs text-amber-500 py-4">
        Dev preview  - served by discovery-frontend in production.
      </div>
    </div>
  );
}