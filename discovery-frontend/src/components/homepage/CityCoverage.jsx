import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { slugify } from "../../lib/seoHelpers";

export default function CityCoverage({ cities = [] }) {
  if (!cities.length) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 py-14">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-primary-600 tracking-wide uppercase mb-1">Coverage</p>
          <h2 className="text-2xl font-display font-bold text-navy-900">Explore by City</h2>
        </div>
        <Link to="/cities" className="hidden sm:flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
          View all <ArrowRight size={15} />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {cities.map((c) => (
          <Link
            key={c.city}
            to={`/${slugify(c.city)}`}
            className="bg-white border border-gray-100 rounded-xl p-4 text-center hover:border-primary-300 hover:shadow-sm transition-all"
          >
            <p className="font-medium text-navy-900 text-sm">{c.city}</p>
            <p className="text-xs text-gray-400">{c.vendor_count} vendors</p>
          </Link>
        ))}
      </div>
    </section>
  );
}