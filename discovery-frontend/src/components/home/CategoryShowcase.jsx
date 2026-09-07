import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import api from "../../lib/api";

// ─── Curated hero images for top categories  - add more as you generate them ──
function loadImg(name) {
  try { return new URL(`../../assets/categories/${name}`, import.meta.url).href; }
  catch { return null; }
}

// Map by slug  - only categories with a real photo get one; rest fall back gracefully
const CURATED_IMAGES = {
  "marriage-hall": loadImg("hall.png"),
  "photographer":  loadImg("photographer.png"),
  "decorator":     loadImg("decorator.png"),
  "caterer":       loadImg("caterer.png"),
  "dj":            loadImg("dj.png"),
  "makeup-artist": loadImg("makeup.png"),
};

// Rotating accent colors for the icon-fallback tiles, so they don't look repetitive
const FALLBACK_ACCENTS = ["#e8192c", "#1a2035", "#f5a623", "#0d9488", "#7c3aed", "#0369a1"];

function CategoryCard({ slug, label, count, img, accent }) {
  return (
    <Link
      to={`/search?category=${slug}`}
      className="group relative block rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
      style={{ aspectRatio: "4/5" }}
    >
      {img ? (
        <>
          <img
            src={img}
            alt={label}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(26,32,53,0) 40%, rgba(26,32,53,0.88) 100%)" }}
          />
        </>
      ) : (
        <>
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: `linear-gradient(160deg, ${accent}14, ${accent}05)` }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: `${accent}18` }}
            >
              <Sparkles size={24} style={{ color: accent }} />
            </div>
          </div>
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(26,32,53,0) 55%, rgba(26,32,53,0.85) 100%)" }}
          />
        </>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="text-white font-semibold text-sm md:text-base mb-0.5 leading-tight">{label}</p>
        {count != null && <p className="text-white/70 text-[11px] md:text-xs">{count} listed</p>}
      </div>
      <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight size={14} className="text-white" />
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl bg-gray-100 animate-pulse"
      style={{ aspectRatio: "4/5" }}
    />
  );
}

export default function CategoryShowcase({ limit = 12 }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [total, setTotal]           = useState(null);

  useEffect(() => {
    let mounted = true;
    api.get("/categories")
      .then(({ data }) => {
        if (!mounted) return;
        // Normalize a few likely response shapes
        const list = data?.data || data?.categories || data || [];
        const normalized = list.map((c) => ({
          slug:  c.slug || c.category_slug || String(c.id),
          label: c.name || c.title || c.label,
          count: c.vendor_count ?? c.count ?? null,
        }));
        setTotal(normalized.length);
        setCategories(normalized.slice(0, limit));
      })
      .catch(() => setCategories([]))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [limit]);

  return (
    <section className="bg-gray-50 py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
          <div>
            <p
              className="text-xs font-bold tracking-widest uppercase mb-3 inline-block px-3 py-1 rounded-full"
              style={{ color: "#e8192c", background: "#e8192c0d" }}
            >
              Explore Categories
            </p>
            <h2
              className="font-display font-extrabold text-navy-900"
              style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", letterSpacing: "-0.02em" }}
            >
              Everything for your event, one platform
            </h2>
          </div>
          <Link
            to="/categories"
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-navy-900 hover:text-primary-700 transition-colors flex-shrink-0"
          >
            {total ? `View all ${total} categories` : "View all categories"} <ArrowRight size={15} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : categories.map((c, i) => (
                <CategoryCard
                  key={c.slug}
                  {...c}
                  img={CURATED_IMAGES[c.slug] || null}
                  accent={FALLBACK_ACCENTS[i % FALLBACK_ACCENTS.length]}
                />
              ))}
        </div>

        <div className="flex sm:hidden justify-center mt-8">
          <Link to="/categories" className="flex items-center gap-1.5 text-sm font-semibold text-navy-900">
            {total ? `View all ${total} categories` : "View all categories"} <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}