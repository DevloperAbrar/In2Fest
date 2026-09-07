import React from "react";
import { Copy, ExternalLink } from "lucide-react";
import { showSuccess } from "../../../../components/common/Toast";
import { BASE_DOMAIN, DISCOVERY_URL } from "../../../../lib/constants";
import Button from "../../../../components/common/Button";

export default function SubdomainTab({ venue, onNext, onBack }) {
  const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  const publicUrl = isDev
    ? `${window.location.protocol}//${venue.subdomain}.${window.location.host}`
    : `https://${venue.subdomain}.${BASE_DOMAIN}`;

  const marketplaceBase = isDev
    ? DISCOVERY_URL
    : `https://${BASE_DOMAIN}`;

  const marketplaceUrl = venue.business_category && venue.city
    ? `${marketplaceBase}/${venue.city.toLowerCase().replace(/\s+/g, "-")}/${venue.business_category}/${venue.subdomain}`
    : null;

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    showSuccess("Copied to clipboard");
  };

  return (
    <div className="space-y-5">
      <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
        <p className="text-sm text-gray-600 mb-1">Your branded website (shareable link)</p>
        <div className="flex items-center justify-between">

          <a href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary-700 flex items-center gap-1 hover:underline break-all"
          >
            {publicUrl} <ExternalLink size={14} />
          </a>
          <button
            onClick={() => copy(publicUrl)}
            className="text-sm text-primary-600 hover:underline flex items-center gap-1 flex-shrink-0"
          >
            <Copy size={14} /> Copy
          </button>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-sm text-gray-600 mb-1">Your discovery marketplace listing</p>
        {marketplaceUrl ? (
          <>
            <div className="flex items-center justify-between gap-3">
              {isDev ? (
                <span className="font-medium text-gray-700 break-all">{marketplaceUrl}</span>
              ) : (

                <a href={marketplaceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-gray-700 flex items-center gap-1 hover:underline break-all"
                >
                  {marketplaceUrl} <ExternalLink size={14} />
                </a>
              )}
              <button
                onClick={() => copy(marketplaceUrl)}
                className="text-sm text-gray-600 hover:underline flex items-center gap-1 flex-shrink-0"
              >
                <Copy size={14} /> Copy
              </button>
            </div>
            {isDev && (
              <p className="mt-2 text-xs text-amber-600">
                This link opens the discovery frontend  - run it separately on localhost to preview it.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400">Set a primary category and city to generate this link.</p>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Note: your subdomain and business category together form your marketplace URL  - changing your category
        later will change this link, so any QR codes or shared links pointing to the old URL will stop working.
      </p>

      <div className="flex items-center justify-between pt-2">
        {onBack ? (
          <Button variant="outline" onClick={onBack}>Back</Button>
        ) : (
          <span />
        )}
        {onNext && (
          <Button variant="outline" onClick={onNext}>Next</Button>
        )}
      </div>
    </div>
  );
}