import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search, MapPin, X } from "lucide-react";
import api from "../../lib/api";

export default function SearchBar({ large = false }) {
  const [sp] = useSearchParams();
  const urlQ = sp.get("q") || "";
  const [q, setQ] = useState(urlQ);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const typed = useRef(false); // only fetch suggestions after the person types
  const navigate = useNavigate();
  const ref = useRef(null);

  // Keep the box in sync with the URL (e.g. after clicking a category tile).
  useEffect(() => {
    typed.current = false;
    setQ(urlQ);
  }, [urlQ]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!typed.current) return undefined;
    if (q.length < 2) { setSuggestions([]); setOpen(false); return undefined; }
    setLoadingSuggestions(true);
    const timer = setTimeout(() => {
      api.get("/autocomplete", { params: { q } })
        .then(({ data }) => {
          setSuggestions(data.data || []);
          setActiveIdx(-1);
          setOpen(true);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setLoadingSuggestions(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  const submitSearch = () => {
    // Keep city / category / budget filters already chosen, only change the keyword.
    const next = new URLSearchParams(sp);
    if (q.trim()) next.set("q", q.trim()); else next.delete("q");
    next.delete("page");
    typed.current = false;
    setOpen(false);
    navigate(`/search?${next.toString()}`);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (open && activeIdx >= 0 && suggestions[activeIdx]) {
        navigate(suggestions[activeIdx].url);
        setOpen(false);
      } else {
        submitSearch();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto" ref={ref}>
      <div
        className={[
          "flex items-center gap-2 bg-white rounded-full border-2 transition-all",
          "shadow-[0_24px_50px_-24px_rgba(26,32,53,0.5)]",
          large ? "pl-5 pr-2 py-2" : "pl-4 pr-1.5 py-1.5",
          open ? "border-gold-500" : "border-transparent focus-within:border-gold-500",
        ].join(" ")}
      >
        <Search size={large ? 20 : 18} className="text-navy-300 flex-shrink-0" />
        <input
          className="flex-1 min-w-0 outline-none text-sm md:text-base bg-transparent text-navy-700 placeholder-navy-300 py-2"
          placeholder="Search gym, library, restaurant, clinic in your city"
          aria-label="Search for a business"
          value={q}
          onChange={(e) => { typed.current = true; setQ(e.target.value); }}
          onKeyDown={onKeyDown}
          onFocus={() => suggestions.length && setOpen(true)}
        />
        {q && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => { typed.current = false; setQ(""); setSuggestions([]); setOpen(false); }}
            className="w-7 h-7 flex items-center justify-center rounded-full text-navy-300 hover:bg-navy-50 hover:text-navy-600 flex-shrink-0"
          >
            <X size={15} />
          </button>
        )}
        <button
          type="button"
          onClick={submitSearch}
          className={[
            "rounded-full bg-accent-500 hover:bg-accent-600 text-white font-extrabold flex-shrink-0 transition active:scale-95",
            "shadow-[0_3px_0_0_#9e0f1b]",
            large ? "px-7 py-3 text-sm" : "px-5 py-2 text-xs",
          ].join(" ")}
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
            className="absolute z-40 mt-3 w-full bg-white border border-navy-100 rounded-3xl shadow-[0_30px_60px_-24px_rgba(26,32,53,0.45)] p-2 text-left"
          >
            {loadingSuggestions && suggestions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-navy-300">Searching…</div>
            ) : (
              suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => { navigate(s.url); setOpen(false); }}
                  className={[
                    "w-full text-left px-3.5 py-2.5 rounded-2xl text-sm flex items-center justify-between gap-3 transition-colors",
                    i === activeIdx ? "bg-navy-50" : "hover:bg-navy-50",
                  ].join(" ")}
                >
                  <span className="text-navy-700 font-bold truncate">{s.label}</span>
                  <span className="flex items-center gap-1 text-navy-400 text-xs flex-shrink-0">
                    <MapPin size={11} className="text-accent-500" /> {s.city}
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