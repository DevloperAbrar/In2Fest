import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search, MapPin } from "lucide-react";
import api from "../../lib/api";

export default function SearchBar({ large = false }) {
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (q.length < 2) { setSuggestions([]); return; }
    setLoadingSuggestions(true);
    const timer = setTimeout(() => {
      api.get("/autocomplete", { params: { q } })
        .then(({ data }) => {
          setSuggestions(data.data);
          setOpen(true);
        })
        .finally(() => setLoadingSuggestions(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  const submitSearch = () => {
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setOpen(false);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={ref}>
      <div
        className={[
          "flex items-center gap-2 bg-white rounded-full shadow-lg shadow-navy-900/5 border transition-colors",
          large ? "px-5 py-2.5" : "px-4 py-2",
          open ? "border-accent-300 ring-4 ring-accent-100" : "border-gray-200",
        ].join(" ")}
      >
        <Search size={large ? 20 : 18} className="text-gray-400 flex-shrink-0" />
        <input
          className="flex-1 outline-none text-sm md:text-base bg-transparent"
          placeholder="Search marriage hall, photographer, caterer in your city"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitSearch()}
          onFocus={() => suggestions.length && setOpen(true)}
        />
        <button
          onClick={submitSearch}
          className={[
            "text-white text-sm font-bold rounded-full flex-shrink-0 shadow-sm transition-transform active:scale-95",
            large ? "px-6 py-2.5" : "px-4 py-1.5",
          ].join(" ")}
          style={{ background: "linear-gradient(135deg,#e8192c,#f5a623)" }}
        >
          Search
        </button>
      </div>

      <AnimatePresence>
        {open && (suggestions.length > 0 || loadingSuggestions) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-20 mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-xl py-2 overflow-hidden"
          >
            {loadingSuggestions && suggestions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">Searching…</div>
            ) : (
              suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { navigate(s.url); setOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between transition-colors"
                >
                  <span className="text-navy-800 font-medium">{s.label}</span>
                  <span className="flex items-center gap-1 text-gray-400 text-xs">
                    <MapPin size={11} /> {s.city}
                  </span>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}