import React, { useEffect, useRef, useState } from "react";
import { X, MapPin, Star, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * MapView — vendors on OpenStreetMap via Leaflet.
 *
 * Coord priority (set by backend search.service.js):
 *   1. vendor.latitude / vendor.longitude  (precise, from google_maps_link)
 *   2. city-centre coords                  (fallback, vendor.coords_are_approximate = true)
 *   3. neither → vendor not shown on map
 */

let L = null;

function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) { resolve(window.L); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function makeIcon(isApproximate) {
  const bg = isApproximate
    ? "linear-gradient(135deg,#9aa0b8,#6d7591)"   // muted for city-centre fallback
    : "linear-gradient(135deg,#e8192c,#f5a623)";   // brand red-gold for precise pin
  return {
    className: "",
    html: `<div style="
      background:${bg};color:white;
      border-radius:50% 50% 50% 0;width:28px;height:28px;
      transform:rotate(-45deg);border:2.5px solid white;
      box-shadow:0 3px 10px rgba(26,32,53,0.3);
      display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);font-size:12px;line-height:1">
        ${isApproximate ? "~" : "📍"}
      </span>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  };
}

function PopupCard({ vendor, onClose }) {
  const navigate = useNavigate();
  if (!vendor) return null;

  const slug        = vendor.slug || vendor.subdomain;
  const citySlug    = vendor.city_slug || (vendor.city || "").toLowerCase().replace(/\s+/g, "-");
  const categorySlug = vendor.category_slug || vendor.business_category;
  const photo       = vendor.cover_photo || vendor.hero_image_url;
  const isApprox    = vendor.coords_are_approximate;

  const directionsUrl = vendor.google_maps_link ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      [vendor.hall_name, vendor.city].filter(Boolean).join(", ")
    )}`;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
      {photo && (
        <img src={photo} alt={vendor.hall_name} className="w-full h-28 object-cover" />
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-semibold text-gray-800 text-sm leading-tight">{vendor.hall_name}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X size={14} />
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-1">
          {vendor.primary_locality ? `${vendor.primary_locality}, ` : ""}{vendor.city}
        </p>

        {isApprox && (
          <p className="text-[10px] text-amber-500 bg-amber-50 border border-amber-100 rounded px-2 py-0.5 mb-1.5 inline-block">
            Approximate location (city centre)
          </p>
        )}

        {vendor.average_rating > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <Star size={11} className="fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-medium text-gray-700">
              {Number(vendor.average_rating).toFixed(1)}
            </span>
            {vendor.review_count > 0 && (
              <span className="text-xs text-gray-400">({vendor.review_count})</span>
            )}
          </div>
        )}

        {vendor.starting_price && (
          <p className="text-xs text-primary-600 font-semibold mb-2">
            ₹{Number(vendor.starting_price).toLocaleString("en-IN")} onwards
          </p>
        )}

        
       <a   href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs text-blue-500 hover:underline mb-2"
        >
          <Navigation size={11} /> Get Directions
        </a>

        {citySlug && categorySlug && slug && (
          <button
            onClick={() => navigate(`/${citySlug}/${categorySlug}/${slug}`)}
            className="w-full text-xs text-white font-semibold py-2 rounded-lg transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#e8192c,#f5a623)" }}
          >
            View Profile
          </button>
        )}
      </div>
    </div>
  );
}

// India centre — used when no vendors have any coords at all
const INDIA_CENTER = [22.5, 80.0];
const INDIA_ZOOM   = 5;

export default function MapView({ vendors = [], onClose }) {
  const mapRef         = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef     = useRef([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [leafletReady, setLeafletReady]     = useState(false);
  const [loadError, setLoadError]           = useState(false);

  // Vendors that have any usable coords (precise or city-centre fallback)
  const mappable = vendors.filter(
    (v) => v.latitude != null && v.longitude != null &&
           !isNaN(Number(v.latitude)) && !isNaN(Number(v.longitude))
  );
  const preciseCount = mappable.filter((v) => !v.coords_are_approximate).length;

  useEffect(() => {
    loadLeaflet()
      .then((leaflet) => { L = leaflet; setLeafletReady(true); })
      .catch(() => setLoadError(true));
  }, []);

  // Init map
  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapInstanceRef.current) return;

    const center = mappable.length > 0
      ? [Number(mappable[0].latitude), Number(mappable[0].longitude)]
      : INDIA_CENTER;
    const zoom = mappable.length === 0 ? INDIA_ZOOM : mappable.length === 1 ? 14 : 12;

    mapInstanceRef.current = L.map(mapRef.current, { center, zoom, zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);

    return () => {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    };
  }, [leafletReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Add/refresh markers
  useEffect(() => {
    if (!leafletReady || !mapInstanceRef.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (mappable.length === 0) return;

    const bounds = [];

    mappable.forEach((vendor) => {
      const lat = Number(vendor.latitude);
      const lng = Number(vendor.longitude);
      const icon = L.divIcon(makeIcon(vendor.coords_are_approximate));

      const marker = L.marker([lat, lng], { icon })
        .addTo(mapInstanceRef.current)
        .on("click", () => setSelectedVendor(vendor));

      markersRef.current.push(marker);
      bounds.push([lat, lng]);
    });

    if (bounds.length > 1) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else if (bounds.length === 1) {
      mapInstanceRef.current.setView(bounds[0], 14);
    }
  }, [leafletReady, vendors]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full h-[560px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm">

      {/* Count badge */}
      <div className="absolute top-3 left-3 z-[1001] bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-navy-800 shadow-sm flex items-center gap-1.5">
        <MapPin size={13} className="text-accent-600" />
        {mappable.length} of {vendors.length} shown on map
        {mappable.length > preciseCount && (
          <span className="text-[10px] text-gray-400 font-normal ml-1">
            ({mappable.length - preciseCount} approximate)
          </span>
        )}
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-[1001] bg-white border border-gray-200 text-gray-600 rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-gray-50 flex items-center gap-1.5"
      >
        <X size={13} /> Close Map
      </button>

      {loadError ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
          <div className="text-center">
            <MapPin size={32} className="mx-auto mb-2 opacity-40" />
            <p>Map could not be loaded.</p>
          </div>
        </div>
      ) : !leafletReady ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
          Loading map…
        </div>
      ) : (
        <div ref={mapRef} className="w-full h-full" />
      )}

      {/* No coords notice */}
      {leafletReady && mappable.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 border border-gray-200 rounded-xl px-5 py-4 text-sm text-gray-500 text-center shadow max-w-xs">
            <MapPin size={24} className="mx-auto mb-2 text-gray-300" />
            <p className="font-medium text-gray-600 mb-1">No locations available</p>
            <p className="text-xs text-gray-400">
              Vendors shown here haven't added a Google Maps link yet.
              Ask them to add one from their profile settings.
            </p>
          </div>
        </div>
      )}

      {/* Popup */}
      {selectedVendor && (
        <PopupCard
          vendor={selectedVendor}
          onClose={() => setSelectedVendor(null)}
        />
      )}
    </div>
  );
}