import React from "react";
import VendorCard from "../search/VendorCard";
import { Reveal } from "../home/landing/ui";

export default function SimilarVendors({ vendors = [], city, category }) {
  if (!vendors.length) return null;

  const sub = [category && `More ${category.replace(/-/g, " ")}`, city && `in ${city}`].filter(Boolean).join(" ");

  return (
    <Reveal className="mt-12">
      <div className="mb-5">
        <h2 className="font-display font-extrabold text-navy-900 text-xl md:text-2xl tracking-tight">
          You might also like
        </h2>
        {sub && <p className="text-sm text-gray-500 mt-1">{sub}</p>}
      </div>

      {/* Phones: swipe strip. Larger screens: grid. */}
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-4 px-4 pb-2 sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible sm:grid sm:grid-cols-2 lg:grid-cols-4">
        {vendors.map((v) => (
          <div key={v.id} className="flex-none w-[270px] snap-start sm:w-auto">
            <VendorCard vendor={v} />
          </div>
        ))}
      </div>
    </Reveal>
  );
}