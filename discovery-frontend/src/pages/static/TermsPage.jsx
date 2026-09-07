import React from "react";
import { Helmet } from "react-helmet-async";
import { BASE_DOMAIN, BRAND_NAME } from "../../lib/constants";

export default function TermsPage() {
  return (
    <>
      <Helmet>
        <title>Terms of Service | {BRAND_NAME}</title>
        <link rel="canonical" href={`https://www.${BASE_DOMAIN}/terms`} />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Terms of Service</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          This page is a placeholder. Replace this content with your actual terms of service before it goes live,
          covering vendor listing rules, payment and refund terms, and platform liability.
        </p>
      </div>
    </>
  );
}