import React, { useState, useRef, useEffect } from "react";
import { MapPin, ChevronDown } from "lucide-react";
import api from "../../lib/api";
import RequestCityModal from "./RequestCityModal";

/**
 * CitySelect — dropdown of cities that ACTUALLY have vendors listed.
 * Data comes live from GET /discovery/cities-with-vendors so it stays in
 * sync automatically as new vendors register in new cities — no more
 * hardcoded city list, and no more free-text typing.
 */
export default function CitySelect({ value, onChange, variant = "field", placeholder = "City", onOpenChange }) {
  const [query, setQuery]         = useState(value || "");
  const [open, setOpen]           = useState(false);
  const [cities, setCities]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCity, setModalCity] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => setQuery(value || ""), [value]);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  // Fetch the live "has vendors" city list once on mount
  useEffect(() => {
    api.get("/cities-with-vendors")
      .then(({ data }) => setCities(data.data || []))
      .catch(() => setCities([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const fn = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const filtered = cities.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  const pick = (city) => {
    setQuery(city.name);
    onChange?.(city.name);
    setOpen(false);
  };

  const clear = (e) => {
    e.stopPropagation();
    setQuery("");
    onChange?.("");
  };

  const requestOther = () => {
    setModalCity(query || "");
    setModalOpen(true);
    setOpen(false);
  };

  const isInline = variant === "inline";

  return (
    <div ref={wrapRef} className={isInline ? "relative flex items-center flex-1 min-w-0 gap-2" : "relative"}>
      {isInline && <MapPin size={16} className="text-gray-400 flex-shrink-0" />}

      <div className={isInline ? "flex-1 min-w-0" : ""}>
        {!isInline && (
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-2">
            <MapPin size={13} /> City
          </label>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={
            isInline
              ? "w-full text-left outline-none text-sm text-gray-800 py-3 flex items-center justify-between gap-1 min-w-0"
              : "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-primary-400 transition-colors bg-white text-left flex items-center justify-between gap-1"
          }
        >
          <span className={query ? "text-gray-800 truncate" : "text-gray-400 truncate"}>
            {query || placeholder}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {query && (
              <span
                onClick={clear}
                className="text-gray-300 hover:text-gray-500 cursor-pointer px-0.5"
                role="button"
                aria-label="Clear city"
              >
                ×
              </span>
            )}
            <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
          </div>
        </button>
      </div>

      {open && (
        <div className="absolute z-30 top-full mt-2 right-0 w-64 bg-white border border-gray-100 rounded-xl shadow-xl py-2 max-h-72 overflow-y-auto">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city…"
            className="w-full px-4 py-2 text-sm outline-none border-b border-gray-50 mb-1"
          />

          {loading && (
            <p className="px-4 py-2.5 text-xs text-gray-400">Loading cities…</p>
          )}

          {!loading && filtered.map((c) => (
            <button
              key={c.slug}
              onClick={() => pick(c)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between gap-3"
            >
              <span className="text-gray-800 font-medium">{c.name}</span>
              {c.state && (
                <span className="text-[10px] font-normal text-gray-400 shrink-0">{c.state}</span>
              )}
            </button>
          ))}

          {!loading && filtered.length === 0 && (
            <p className="px-4 py-2.5 text-xs text-gray-400">
              {query ? `No city matching "${query}"` : "No cities with vendors yet"}
            </p>
          )}

          <div className="border-t border-gray-50 mt-1 pt-1">
            <button
              onClick={requestOther}
              className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-gray-50 transition-colors"
              style={{ color: "#e8192c" }}
            >
              Don't see your city? Request it →
            </button>
          </div>
        </div>
      )}

      <RequestCityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultCity={modalCity}
      />
    </div>
  );
}