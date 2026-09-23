import React from "react";
import { Helmet } from "react-helmet-async";
import { BASE_DOMAIN } from "../../lib/constants";

const SITE_URL = `https://www.${BASE_DOMAIN}`;

const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

// ─────────────────────────────────────────────────────────────
// 1. Vendor Profile Page
//    LocalBusiness + AggregateRating + BreadcrumbList + ImageGallery
// ─────────────────────────────────────────────────────────────
export function VendorProfileSchema({ venue, city, category }) {
  if (!venue) return null;

  const url = `${SITE_URL}/${city}/${category}/${venue.slug || venue.venue_slug}`;
  const categoryLabel = category.replace(/-/g, " ");

  // Map our category slugs to schema.org LocalBusiness subtypes
  const SCHEMA_TYPE_MAP = {
    "banquet-hall":       "EventVenue",
    "marriage-hall":      "EventVenue",
    "party-lawn":         "EventVenue",
    "farmhouse":          "EventVenue",
    "tent-house":         "EventVenue",
    "caterer":            "FoodEstablishment",
    "photographer":       "LocalBusiness",
    "videographer":       "LocalBusiness",
    "decorator":          "LocalBusiness",
    "makeup-artist":      "BeautySalon",
    "mehendi-artist":     "LocalBusiness",
    "dj":                 "EntertainmentBusiness",
    "singer":             "EntertainmentBusiness",
    "event-manager":      "EventPlanner",
    "wedding-planner":    "EventPlanner",
    "travel-transport":   "TravelAgency",
    "sound-lighting":     "LocalBusiness",
    "card-printing":      "LocalBusiness",
    "horse-buggy":        "LocalBusiness",
    "pandit-services":    "LocalBusiness",
  };

  const businessType = SCHEMA_TYPE_MAP[category] || "LocalBusiness";

  const images = [
    ...(venue.hero_image_url ? [venue.hero_image_url] : []),
    ...(Array.isArray(venue.gallery) ? venue.gallery.slice(0, 5).map(g => g?.url).filter(Boolean) : []),
  ];

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      // LocalBusiness (or subtype)
      {
        "@type": businessType,
        "@id": url,
        name: venue.hall_name,
        description: venue.long_description?.slice(0, 320) || venue.specialty_tagline || `${venue.hall_name} is a verified ${categoryLabel} in ${venue.city} listed on In2Fest.`,
        url,
        ...(venue.whatsapp_number ? { telephone: venue.whatsapp_number } : {}),
        address: {
          "@type": "PostalAddress",
          streetAddress: venue.address || undefined,
          addressLocality: venue.primary_locality || venue.city,
          addressRegion: venue.city_state || "Madhya Pradesh",
          postalCode: venue.full_pincode || undefined,
          addressCountry: "IN",
        },
        ...(venue.latitude && venue.longitude ? {
          geo: { "@type": "GeoCoordinates", latitude: venue.latitude, longitude: venue.longitude }
        } : {}),
        ...(images.length > 0 ? { image: images } : {}),
        ...(venue.starting_price ? {
          priceRange: venue.maximum_price
            ? `₹${Number(venue.starting_price).toLocaleString("en-IN")} - ₹${Number(venue.maximum_price).toLocaleString("en-IN")}`
            : `From ₹${Number(venue.starting_price).toLocaleString("en-IN")}`
        } : {}),
        ...(venue.review_count >= 3 && venue.average_rating ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(venue.average_rating).toFixed(1),
            reviewCount: venue.review_count,
            bestRating: "5",
            worstRating: "1",
          }
        } : {}),
        ...(venue.year_established ? { foundingDate: String(venue.year_established) } : {}),
        // SameAs - vendor's own subdomain site
        sameAs: [`https://${venue.slug || venue.subdomain}.in2fest.com`],
        isPartOf: { "@id": WEBSITE_ID },
      },

      // BreadcrumbList
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: venue.city, item: `${SITE_URL}/${city}` },
          { "@type": "ListItem", position: 3, name: categoryLabel, item: `${SITE_URL}/${city}/${category}` },
          { "@type": "ListItem", position: 4, name: venue.hall_name, item: url },
        ],
      },
    ],
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. City + Category Page (listing page)
//    ItemList + BreadcrumbList + FAQPage
// ─────────────────────────────────────────────────────────────
export function CityListSchema({ vendors = [], city, cityLabel, category, categoryLabel }) {
  const pageUrl = `${SITE_URL}/${city}/${category}`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: `Best ${categoryLabel} in ${cityLabel}`,
        description: `Verified and reviewed ${categoryLabel} options in ${cityLabel}. Compare prices, photos and ratings.`,
        url: pageUrl,
        numberOfItems: vendors.length,
        itemListElement: vendors.slice(0, 20).map((v, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: v.hall_name,
          url: `${SITE_URL}/${city}/${category}/${v.slug || v.venue_slug}`,
          ...(v.hero_image_url ? { image: v.hero_image_url } : {}),
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: cityLabel, item: `${SITE_URL}/${city}` },
          { "@type": "ListItem", position: 3, name: `${categoryLabel} in ${cityLabel}`, item: pageUrl },
        ],
      },
      // FAQ schema — helps grab "People Also Ask" box on Google
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `How many ${categoryLabel} are there in ${cityLabel}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `There are ${vendors.length} verified ${categoryLabel} listed in ${cityLabel} on In2Fest. You can compare prices, photos and ratings to find the best one for your event.`,
            },
          },
          {
            "@type": "Question",
            name: `How do I find the best ${categoryLabel} in ${cityLabel}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `On In2Fest you can browse verified ${categoryLabel} in ${cityLabel}, check their photos and reviews, compare prices and contact them directly — all for free.`,
            },
          },
          {
            "@type": "Question",
            name: `What is the price of ${categoryLabel} in ${cityLabel}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `The price of ${categoryLabel} in ${cityLabel} varies by vendor. Visit their profiles on In2Fest to compare starting prices, packages and contact them for custom quotes.`,
            },
          },
        ],
      },
    ],
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. City Landing Page
//    LocalArea + BreadcrumbList
// ─────────────────────────────────────────────────────────────
export function CityPageSchema({ cityLabel, citySlug, categories = [] }) {
  const pageUrl = `${SITE_URL}/${citySlug}`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": pageUrl,
        name: `Wedding & Event Vendors in ${cityLabel}`,
        description: `Find verified banquet halls, marriage halls, decorators, caterers, photographers and more in ${cityLabel}. Browse and compare on In2Fest.`,
        url: pageUrl,
        isPartOf: { "@id": WEBSITE_ID },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: `Vendors in ${cityLabel}`, item: pageUrl },
        ],
      },
    ],
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. Home Page Schema
//    Organization + WebSite + SearchAction + FAQPage
// ─────────────────────────────────────────────────────────────
export function HomePageSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: "In2Fest",
        alternateName: ["In2Fest.com", "In 2 Fest", "In Two Fest", "Intwofest"],
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/logo.png`,
          width: 400, height: 100,
        },
        sameAs: [
          "https://www.instagram.com/in2fest/",
          "https://www.facebook.com/in2fest/",
          "https://www.linkedin.com/company/in2fest",
        ],
        foundingDate: "2024",
        areaServed: { "@type": "Country", name: "India" },
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        name: "In2Fest",
        url: SITE_URL,
        publisher: { "@id": ORG_ID },
        inLanguage: "en-IN",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is In2Fest?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "In2Fest is a free platform to find, compare and contact verified wedding and event vendors across India — including banquet halls, marriage halls, decorators, caterers, photographers, DJs, mehndi artists, wedding planners and more.",
            },
          },
          {
            "@type": "Question",
            name: "How do I find a banquet hall near me on In2Fest?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Go to In2Fest.com, select your city and choose 'Banquet Hall' from the categories. You can compare halls by price, capacity, photos and ratings, and contact them directly.",
            },
          },
          {
            "@type": "Question",
            name: "Is In2Fest free to use?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes, searching and browsing vendors on In2Fest is completely free for customers. Vendors can also list their business for free.",
            },
          },
          {
            "@type": "Question",
            name: "How is In2Fest different from JustDial or Shaadi.com?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "In2Fest focuses exclusively on wedding and event vendors. Every vendor gets a dedicated profile website (e.g. armanagment.in2fest.com) with photos, pricing and reviews — not just a listing. You can contact vendors directly without middlemen.",
            },
          },
        ],
      },
    ],
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. Generic BreadcrumbList — reusable for any page
// ─────────────────────────────────────────────────────────────
export function BreadcrumbSchema({ items = [] }) {
  if (items.length === 0) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.url ? { item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}` } : {}),
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}