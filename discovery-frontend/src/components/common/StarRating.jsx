import React from "react";
import { Star } from "lucide-react";

export default function StarRating({ rating = 0, reviewCount = 0, size = 14 }) {
  const rounded = Math.round(Number(rating) * 2) / 2;

  if (!reviewCount || reviewCount < 3) {
    return <span className="text-xs text-gray-400">New listing</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <Star size={size} className="fill-amber-400 text-amber-400" />
      <span className="text-sm font-medium text-gray-700">{Number(rating).toFixed(1)}</span>
      <span className="text-xs text-gray-400">({reviewCount} reviews)</span>
    </div>
  );
}