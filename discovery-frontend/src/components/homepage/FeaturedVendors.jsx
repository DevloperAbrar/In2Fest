import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import VendorCard from "../search/VendorCard";

export default function FeaturedVendors({ vendors = [] }) {
  if (!vendors.length) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 py-14">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-primary-600 tracking-wide uppercase mb-1">Handpicked for you</p>
          <h2 className="text-2xl font-display font-bold text-navy-900">Featured Vendors</h2>
        </div>
        <Link to="/search" className="hidden sm:flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
          View all <ArrowRight size={15} />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {vendors.map((v) => <VendorCard key={v.id} vendor={v} />)}
      </div>
    </section>
  );
}