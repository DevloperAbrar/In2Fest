import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Star, BadgeCheck, MapPin, ArrowRight, Sparkles } from "lucide-react";
import api from "../../lib/api";

function VendorCard({ v }) {
  return (
    <Link
      to={`/vendor/${v.slug}`}
      className="group flex-shrink-0 w-64 md:w-auto bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
    >
      <div className="relative h-36 overflow-hidden">
        {v.image ? (
          <img
            src={v.image}
            alt={v.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#1a2035,#2d3a5e)" }}
          >
            <span className="text-white/40 text-2xl font-display font-bold">
              {v.name?.[0]}
            </span>
          </div>
        )}
        {v.verified && (
          <span className="absolute top-2.5 left-2.5 flex items-center gap-1 text-[10px] font-bold text-white bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
            <BadgeCheck size={11} style={{ color: "#4ade80" }} /> Verified
          </span>
        )}
        {v.category && (
          <span className="absolute top-2.5 right-2.5 text-[10px] font-semibold text-navy-900 bg-white/90 px-2 py-1 rounded-full">
            {v.category}
          </span>
        )}
      </div>
      <div className="p-3.5">
        <p className="font-semibold text-navy-900 text-sm truncate mb-1">{v.name}</p>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[11px] text-gray-400 min-w-0">
            <MapPin size={11} className="flex-shrink-0" />
            <span className="truncate">{v.city}</span>
          </span>
          {v.rating != null && (
            <span className="flex items-center gap-0.5 text-[11px] font-semibold text-gray-600 flex-shrink-0">
              <Star size={11} style={{ color: "#f5a623" }} className="fill-current" />
              {v.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return <div className="flex-shrink-0 w-64 md:w-auto h-52 rounded-2xl bg-gray-100 animate-pulse" />;
}

function EmptyState() {
  return (
    <div className="col-span-full bg-gray-50 border border-dashed border-gray-200 rounded-2xl py-14 text-center px-6">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
        style={{ background: "#e8192c12" }}
      >
        <Sparkles size={20} style={{ color: "#e8192c" }} />
      </div>
      <h3 className="font-semibold text-navy-900 text-sm mb-1.5">
        We're just getting started here
      </h3>
      <p className="text-xs text-gray-500 max-w-sm mx-auto mb-5">
        Be one of the first vendors featured on the platform  - early listings
        get the most visibility.
      </p>
      <Link
        to="/for-vendors"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-white px-4 py-2.5 rounded-lg"
        style={{ background: "#e8192c" }}
      >
        List Your Business <ArrowRight size={13} />
      </Link>
    </div>
  );
}

export default function FeaturedVendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.get("/vendors/featured")
      .then(({ data }) => {
        if (!mounted) return;
        const list = data?.data || data?.vendors || data || [];
        setVendors(list.map((v) => ({
          slug:     v.slug || v.id,
          name:     v.business_name || v.name,
          city:     v.city,
          category: v.category_name || v.category,
          rating:   v.rating ?? v.average_rating ?? null,
          image:    v.cover_image || v.logo || v.image || null,
          verified: !!v.is_verified,
        })));
      })
      .catch(() => setVendors([]))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  return (
    <section className="bg-white py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
          <div>
            <p
              className="text-xs font-bold tracking-widest uppercase mb-3 inline-block px-3 py-1 rounded-full"
              style={{ color: "#e8192c", background: "#e8192c0d" }}
            >
              Featured Vendors
            </p>
            <h2
              className="font-display font-extrabold text-navy-900"
              style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", letterSpacing: "-0.02em" }}
            >
              Meet vendors people are booking
            </h2>
          </div>
          <Link
            to="/search"
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-navy-900 hover:text-primary-700 transition-colors flex-shrink-0"
          >
            View all vendors <ArrowRight size={15} />
          </Link>
        </div>

        {/* Mobile: horizontal scroll · Desktop: grid */}
        <div className="flex md:grid md:grid-cols-4 gap-4 overflow-x-auto md:overflow-visible pb-2 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : vendors.length > 0
              ? vendors.slice(0, 8).map((v) => (
                  <div key={v.slug} className="snap-start">
                    <VendorCard v={v} />
                  </div>
                ))
              : <EmptyState />
          }
        </div>

        <div className="flex sm:hidden justify-center mt-8">
          <Link to="/search" className="flex items-center gap-1.5 text-sm font-semibold text-navy-900">
            View all vendors <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}