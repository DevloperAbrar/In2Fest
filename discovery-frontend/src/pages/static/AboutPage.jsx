import React from "react";
import { Helmet } from "react-helmet-async";
import { BASE_DOMAIN, BRAND_NAME } from "../../lib/constants";

export default function AboutPage() {
  return (
    <>
      <Helmet>
        <title>About Us | {BRAND_NAME}</title>
        <meta name="description" content={`Learn about ${BRAND_NAME}, a platform helping people find and book verified wedding and event vendors near them.`} />
        <link rel="canonical" href={`https://www.${BASE_DOMAIN}/about`} />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">About {BRAND_NAME}</h1>
        <div className="text-sm text-gray-600 space-y-4 leading-relaxed">
          <p>
            {BRAND_NAME} is a platform built to make finding and booking wedding and event vendors simple and
            transparent. From banquet halls and marriage lawns to photographers, decorators, caterers and event
            management companies, we bring verified vendors and real customers onto one platform.
          </p>
          <p>
            Replace this paragraph with your company's actual founding story, mission and team details before this page goes live.
          </p>
        </div>
      </div>
    </>
  );
}