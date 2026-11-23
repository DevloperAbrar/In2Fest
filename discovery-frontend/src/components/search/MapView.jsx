import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, MapPin, Star, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * MapView: every vendor that matches the search, on OpenStreetMap via Leaflet.
 *
 * Coordinates come from the backend (/search/map). Each vendor has latitude and longitude, and
 * coords_are_approximate = true when only the city centre is known (shown as a grey "~" pin).
 * Close pins are grouped into clusters so many vendors stay readable.
 */

const CDN = "https://cdnjs.cloudflare.com/ajax/libs";
const LEAFLET_CSS = `${CDN}/leaflet/1.9.4/leaflet.min.css`;
const LEAFLET_JS = `${CDN}/leaflet/1.9.4/leaflet.min.js`;
const CLUSTER_CSS = [`${CDN}/leaflet.markercluster/1.5.3/MarkerCluster.css`, `${CDN}/leaflet.markercluster/1.5.3/MarkerCluster.Default.css`];
const CLUSTER_JS = `${CDN}/leaflet.markercluster/1.5.3/leaflet.markercluster.js`;

function loadCss(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") resolve();
      else { existing.addEventListener("load", () => resolve()); existing.addEventListener("error", reject); }
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => { script.dataset.loaded = "1"; resolve(); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Leaflet is required. The cluster plugin is optional: if it fails to load, plain pins are used.
async function loadLeaflet() {
  loadCss(LEAFLET_CSS);
  if (!window.L) await loadScript(LEAFLET_JS);
  CLUSTER_CSS.forEach(loadCss);
  if (!window.L.markerClusterGroup) {
    try { await loadScript(CLUSTER_JS); } catch { /* plain pins */ }
  }
  return window.L;
}

function makeIcon(isApproximate) {
  const bg = isApproximate
    ? "linear-gradient(135deg,#9aa0b8,#6d7591)"
    : "linear-gradient(135deg,#e8192c,#f5a623)";
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

  const slug = vendor.slug || vendor.subdomain;
  const citySlug = vendor.city_slug || (vendor.city || "").toLowerCase().replace(/\s+/g, "-");
  const categorySlug = vendor.category_slug || vendor.business_category;
  const photo = vendor.cover_photo || vendor.hero_image_url;

  const directionsUrl = vendor.google_maps_link ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      [vendor.hall_name, vendor.city].filter(Boolean).join(", ")
    )}`;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
      {photo && <img src={photo} alt={vendor.hall_name} className="w-full h-28 object-cover" />}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-semibold text-gray-800 text-sm leading-tight">{vendor.hall_name}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0" aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-1">
          {vendor.primary_locality ? `${vendor.primary_locality}, ` : ""}{vendor.city}
        </p>

        {vendor.coords_are_approximate && (
          <p className="text-[10px] text-amber-500 bg-amber-50 border border-amber-100 rounded px-2 py-0.5 mb-1.5 inline-block">
            Approximate location (city area)
          </p>
        )}

        {vendor.average_rating > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <Star size={11} className="fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-medium text-gray-700">{Number(vendor.average_rating).toFixed(1)}</span>
            {vendor.review_count > 0 && <span className="text-xs text-gray-400">({vendor.review_count})</span>}
          </div>
        )}

        {vendor.starting_price && (
          <p className="text-xs text-primary-600 font-semibold mb-2">
            ₹{Number(vendor.starting_price).toLocaleString("en-IN")} onwards
          </p>
        )}

        <a
          href={directionsUrl}
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

const INDIA_CENTER = [22.5, 80.0];
const INDIA_ZOOM = 5;

export default function MapView({ vendors = [], total, unmapped = 0, truncated = false, loading = false, onClose }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerRef = useRef(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const mappable = useMemo(
    () => vendors.filter((v) => v.latitude != null && v.longitude != null && !isNaN(Number(v.latitude)) && !isNaN(Number(v.longitude))),
    [vendors]
  );
  const approxCount = mappable.filter((v) => v.coords_are_approximate).length;
  const shownTotal = total != null ? total : vendors.length;

  useEffect(() => {
    let off = false;
    loadLeaflet()
      .then(() => { if (!off) setLeafletReady(true); })
      .catch(() => { if (!off) setLoadError(true); });
    return () => { off = true; };
  }, []);

  // Create the map once.
  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapInstanceRef.current) return undefined;
    const L = window.L;
    const map = L.map(mapRef.current, { center: INDIA_CENTER, zoom: INDIA_ZOOM, zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    mapInstanceRef.current = map;
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerRef.current = null;
    };
  }, [leafletReady]);

  // Draw every vendor. Runs again whenever the list changes (new filters).
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!leafletReady || !map) return undefined;
    const L = window.L;

    if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
    setSelectedVendor(null);
    if (mappable.length === 0) return undefined;

    const group = L.markerClusterGroup
      ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 45, spiderfyOnMaxZoom: true })
      : L.layerGroup();
    const bounds = [];

    mappable.forEach((vendor) => {
      const lat = Number(vendor.latitude);
      const lng = Number(vendor.longitude);
      L.marker([lat, lng], { icon: L.divIcon(makeIcon(vendor.coords_are_approximate)) })
        .on("click", () => setSelectedVendor(vendor))
        .addTo(group);
      bounds.push([lat, lng]);
    });

    map.addLayer(group);
    layerRef.current = group;

    if (bounds.length > 1) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    else map.setView(bounds[0], 14);

    return () => {
      if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
    };
  }, [leafletReady, mappable]);

  return (
    <div className="relative w-full h-[560px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm">

      {/* Count badge */}
      <div className="absolute top-3 left-3 z-[1001] bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-navy-800 shadow-sm flex items-center gap-1.5">
        <MapPin size={13} className="text-accent-600" />
        {loading ? "Loading vendors…" : `${mappable.length} of ${shownTotal} shown on map`}
        {!loading && approxCount > 0 && (
          <span className="text-[10px] text-gray-400 font-normal ml-1">({approxCount} approximate)</span>
        )}
        {!loading && unmapped > 0 && (
          <span className="text-[10px] text-gray-400 font-normal ml-1">· {unmapped} without location</span>
        )}
        {!loading && truncated && (
          <span className="text-[10px] text-gray-400 font-normal ml-1">· narrow your filters to see the rest</span>
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

      {/* No locations notice */}
      {leafletReady && !loading && mappable.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 border border-gray-200 rounded-xl px-5 py-4 text-sm text-gray-500 text-center shadow max-w-xs">
            <MapPin size={24} className="mx-auto mb-2 text-gray-300" />
            <p className="font-medium text-gray-600 mb-1">No locations available</p>
            <p className="text-xs text-gray-400">
              These vendors have not added an address or a Google Maps link yet.
            </p>
          </div>
        </div>
      )}

      {selectedVendor && <PopupCard vendor={selectedVendor} onClose={() => setSelectedVendor(null)} />}
    </div>
  );
}