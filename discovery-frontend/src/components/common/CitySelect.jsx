import React, { useState, useRef, useEffect } from "react";
import { MapPin, ChevronDown } from "lucide-react";
import { LAUNCH_CITIES } from "../../data/launchCities";
import RequestCityModal from "./RequestCityModal";

export default function CitySelect({ value, onChange, variant = "field", placeholder = "City" }) {
  const [query, setQuery]         = useState(value || "");
  const [open, setOpen]           = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCity, setModalCity] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => setQuery(value || ""), [value]);

  useEffect(() => {
    const fn = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const filtered = LAUNCH_CITIES.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  const pick = (city) => {
    if (!city.live) {
      setModalCity(city.name);
      setModalOpen(true);
      setOpen(false);
      return;
    }
    setQuery(city.name);
    onChange?.(city.name);
    setOpen(false);
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
          <ChevronDown size={14} className={`text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
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
          {filtered.map((c) => (
            <button
              key={c.slug}
              onClick={() => pick(c)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between gap-3"
            >
              <span className="text-gray-800 font-medium">{c.name}</span>
              {c.live ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: "#16a34a" }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#16a34a" }} /> Live
                </span>
              ) : (
                <span className="text-[10px] font-medium text-gray-300">Coming soon</span>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-4 py-2.5 text-xs text-gray-400">No matching city</p>
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