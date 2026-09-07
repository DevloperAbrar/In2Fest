import React from "react";
import { Helmet } from "react-helmet-async";
import { BASE_DOMAIN, BRAND_NAME, BRAND_VARIANTS } from "../constants";

const SITE_URL = `https://www.${BASE_DOMAIN}`;

// Organization + WebSite schema, rendered once on the homepage.
// alternateName covers the spelling variants people actually search for,
// so Google associates all of them with the same brand entity.
export function HomeSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: BRAND_NAME,
        alternateName: BRAND_VARIANTS,
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: BRAND_NAME,
        alternateName: BRAND_VARIANTS,
        url: SITE_URL,
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      }
    ]
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

// Generic FAQPage schema. Only use this alongside FAQ content that is
// actually visible on the page, matching Google's structured data rules.
export function FAQSchema({ items = [] }) {
  if (items.length === 0) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}