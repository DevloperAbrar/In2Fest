import React from "react";
import { Helmet } from "react-helmet-async";
import { BASE_DOMAIN, BRAND_NAME } from "../../lib/constants";

export default function PrivacyPage() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | {BRAND_NAME}</title>
        <link rel="canonical" href={`https://www.${BASE_DOMAIN}/privacy`} />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Privacy Policy</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          This page is a placeholder. Replace this content with your actual privacy policy before it goes live.
          It should state what data {BRAND_NAME} collects, how it is used, how it is stored, and how a user can
          request its deletion. Consider having it reviewed by a lawyer given real user data (phone numbers, OTP
          records, payment details) passes through this platform.
        </p>
      </div>
    </>
  );
}