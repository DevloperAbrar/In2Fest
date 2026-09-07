import React from "react";
import VendorCard from "../search/VendorCard";

export default function SimilarVendors({ vendors = [] }) {
  if (!vendors.length) return null;
  return (
    <div>
      <h2 className="font-display font-bold text-navy-900 text-lg mb-4">You Might Also Like</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {vendors.map((v) => <VendorCard key={v.id} vendor={v} />)}
      </div>
    </div>
  );
}