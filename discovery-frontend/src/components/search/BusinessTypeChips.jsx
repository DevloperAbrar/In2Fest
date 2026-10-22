import React, { useEffect, useState } from "react";
import api from "../../lib/api";

// "What are you looking for?" chips for General categories (Other Business): CCTV, solar, printing...
// The list comes from the vendors that really exist in the chosen city, with counts.
// For every other category the server returns nothing and this renders nothing.
export default function BusinessTypeChips({ city, category, active, onSelect }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!category) {
      setItems([]);
      return undefined;
    }
    let cancelled = false;
    api
      .get("/business-types", { params: { city: city || undefined, category } })
      .then(({ data }) => {
        if (cancelled) return;
        const list = data.data.items || [];
        setItems(list);
        // A type picked earlier that does not exist for this category / city is dropped.
        if (active && !list.some((t) => t.slug === active)) onSelect(undefined);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, category]);

  if (!items.length) return null;

  return (
    <div className="mb-3">
      <p className="text-xs text-gray-400 mb-2">What are you looking for?</p>
      <div className="flex flex-wrap gap-2">
        {items.map((t) => {
          const on = active === t.slug;
          return (
            <button
              key={t.slug}
              type="button"
              onClick={() => onSelect(on ? undefined : t.slug)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${on ? "bg-navy-700 text-white border-navy-700" : "bg-white text-gray-600 border-gray-200 hover:border-navy-300"}`}
            >
              {t.label} <span className={on ? "text-white/70" : "text-gray-400"}>({t.count})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}