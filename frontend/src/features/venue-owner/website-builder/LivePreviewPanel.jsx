import React from "react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { BASE_DOMAIN } from "../../../lib/constants";

export default function LivePreviewPanel() {
  const { venue } = useVenue();
  if (!venue) return null;

  const previewUrl = `https://${venue.subdomain}.${BASE_DOMAIN}`;

  return (
    <div className="fixed bottom-4 right-4 w-80 h-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden hidden lg:block">
      <div className="bg-gray-100 px-3 py-2 text-xs text-gray-500 border-b">Live Preview</div>
      <iframe src={previewUrl} title="Live preview" className="w-full h-full" />
    </div>
  );
}