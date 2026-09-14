import React, { useEffect, useState } from "react";
import { X, Bookmark, Loader2, ExternalLink } from "lucide-react";
import { usePublicAuth } from "../../context/PublicAuthContext.jsx";
import publicAuthApi from "../../services/publicAuthApi.js";

export default function SavedVendorsModal({ onClose }) {
  const { user } = usePublicAuth();
  const [vendors, setVendors] = useState(null);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("visitorAccessToken");
    publicAuthApi
      .get("/saved", { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setVendors(data.data))
      .catch(() => setVendors([]));
  }, [user]);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Bookmark size={17} className="text-accent-600" />
            <h3 className="font-semibold text-gray-800">Saved Vendors</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-3">
          {vendors === null && (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-gray-300" size={24} />
            </div>
          )}

          {vendors?.length === 0 && (
            <div className="text-center py-12">
              <Bookmark size={36} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-500">No saved vendors yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Click the Save button on any vendor profile to bookmark them here.
              </p>
            </div>
          )}

          {vendors?.map((v) => (
            
            <a  key={v.id}
              href={`/${v.city_slug}/${v.category_slug}/${v.slug}`}
              onClick={onClose}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors group"
            >
              {/* Thumbnail */}
              <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                {v.hero_image_url ? (
                  <img
                    src={v.hero_image_url}
                    alt={v.hall_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Bookmark size={20} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{v.hall_name}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate capitalize">
                  {v.category_slug?.replace(/-/g, " ")} · {v.city}
                </p>
              </div>

              <ExternalLink
                size={15}
                className="text-gray-300 group-hover:text-accent-500 flex-shrink-0 transition-colors"
              />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}