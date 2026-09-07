import React, { useEffect, useRef, useState } from "react";
import { X, MapPin, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * MapView
 *
 * Shows search result vendors as pins on an OpenStreetMap (via Leaflet).
 * No API key required  - uses free OSM tiles.
 *
 * Props:
 *   vendors : array  - same vendor list from search results
 *   onClose : () => void  - called when user closes map view
 */

// Dynamically load Leaflet so it doesn't break SSR-style builds
let L = null;

function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) { resolve(window.L); return; }

    // Load Leaflet CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => resolve(window.L);
    document.head.appendChild(script);
  });
}

function PopupCard({ vendor, onClose }) {
  const navigate = useNavigate();
  if (!vendor) return null;

  const slug = vendor.slug || vendor.venue_slug;
  const city = vendor.city_slug || vendor.city?.toLowerCase().replace(/\s+/g, "-");
  const category = vendor.category_slug || vendor.primary_category;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
      {vendor.cover_photo && (
        <img
          src={vendor.cover_photo}
          alt={vendor.hall_name}
          className="w-full h-28 object-cover"
        />
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
        {vendor.average_rating > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <Star size={11} className="fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-medium text-gray-700">{Number(vendor.average_rating).toFixed(1)}</span>
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
        {city && category && slug && (
          <button
            onClick={() => navigate(`/${city}/${category}/${slug}`)}
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

export default function MapView({ vendors = [], onClose }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Vendors with valid coordinates
  const mappable = vendors.filter(
    (v) => v.latitude && v.longitude && !isNaN(Number(v.latitude)) && !isNaN(Number(v.longitude))
  );

  useEffect(() => {
    loadLeaflet()
      .then((leaflet) => { L = leaflet; setLeafletReady(true); })
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapInstanceRef.current) return;

    // Default center  - Indore, MP
    const defaultCenter = [22.7196, 75.8577];
    const center = mappable.length > 0
      ? [Number(mappable[0].latitude), Number(mappable[0].longitude)]
      : defaultCenter;

    mapInstanceRef.current = L.map(mapRef.current, {
      center,
      zoom: mappable.length > 1 ? 12 : 14,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletReady]);

  // Add/update markers when vendors or map changes
  useEffect(() => {
    if (!leafletReady || !mapInstanceRef.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (mappable.length === 0) return;

    const bounds = [];

    mappable.forEach((vendor) => {
      const lat = Number(vendor.latitude);
      const lng = Number(vendor.longitude);

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          background:linear-gradient(135deg,#e8192c,#f5a623);color:white;
          border-radius:50% 50% 50% 0;
          width:30px;height:30px;
          transform:rotate(-45deg);
          border:2.5px solid white;
          box-shadow:0 3px 10px rgba(26,32,53,0.35);
          display:flex;align-items:center;justify-content:center;
        "><span style="transform:rotate(45deg);font-size:12px">📍</span></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      });

      const marker = L.marker([lat, lng], { icon })
        .addTo(mapInstanceRef.current)
        .on("click", () => setSelectedVendor(vendor));

      markersRef.current.push(marker);
      bounds.push([lat, lng]);
    });

    if (bounds.length > 1) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [leafletReady, mappable]);

  return (
    <div className="relative w-full h-[560px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Vendors-on-map count - quick, free "analytics" readout */}
      <div className="absolute top-3 left-3 z-[1001] bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-navy-800 shadow-sm flex items-center gap-1.5">
        <MapPin size={13} className="text-accent-600" />
        {mappable.length} of {vendors.length} shown on map
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-[1001] bg-white border border-gray-200 text-gray-600 rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-gray-50 flex items-center gap-1.5"
      >
        <X size={13} /> Close Map
      </button>

      {/* Map container */}
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

      {/* No coordinates notice */}
      {leafletReady && mappable.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500 text-center shadow">
            <MapPin size={20} className="mx-auto mb-1 text-gray-400" />
            No vendor locations available to pin on map
          </div>
        </div>
      )}

      {/* Vendor popup card */}
      {selectedVendor && (
        <PopupCard vendor={selectedVendor} onClose={() => setSelectedVendor(null)} />
      )}
    </div>
  );
}