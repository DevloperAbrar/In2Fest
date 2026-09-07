import React from "react";
import { Helmet } from "react-helmet-async";
import { BASE_DOMAIN } from "../../lib/constants";

/**
 * SchemaMarkup
 *
 * Renders JSON-LD structured data in <head> via react-helmet-async.
 * Use the named exports for the right schema type per page.
 *
 * Usage:
 *   <VendorProfileSchema venue={venue} city="indore" category="marriage-hall" />
 *   <CityListSchema vendors={vendors} city="indore" category="marriage-hall" />
 *   <BreadcrumbSchema items={[{ label, url }]} />
 */

const SITE_URL = `https://www.${BASE_DOMAIN}`;

// ─────────────────────────────────────────────
// 1. Vendor Profile Page  - LocalBusiness + AggregateRating + BreadcrumbList
// ─────────────────────────────────────────────
export function VendorProfileSchema({ venue, city, category }) {
  if (!venue) return null;

  const url = `${SITE_URL}/${city}/${category}/${venue.slug || venue.venue_slug}`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      // LocalBusiness
      {
        "@type": "LocalBusiness",
        "@id": url,
        name: venue.hall_name,
        description: venue.long_description?.slice(0, 300) || venue.specialty_tagline || "",
        url,
        telephone: venue.whatsapp_number || venue.owner_phone || undefined,
        address: {
          "@type": "PostalAddress",
          streetAddress: venue.address || undefined,
          addressLocality: venue.primary_locality || venue.city,
          addressRegion: "Madhya Pradesh",
          postalCode: venue.full_pincode || undefined,
          addressCountry: "IN",
        },
        ...(venue.latitude && venue.longitude
          ? { geo: { "@type": "GeoCoordinates", latitude: venue.latitude, longitude: venue.longitude } }
          : {}),
        ...(venue.gallery?.length > 0
          ? { image: venue.gallery.slice(0, 3) }
          : {}),
        // AggregateRating  - only if enough reviews
        ...(venue.review_count >= 3 && venue.average_rating
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: Number(venue.average_rating).toFixed(1),
                reviewCount: venue.review_count,
                bestRating: "5",
                worstRating: "1",
              },
            }
          : {}),
        ...(venue.starting_price
          ? {
              priceRange:
                venue.maximum_price
                  ? `₹${Number(venue.starting_price).toLocaleString("en-IN")} - ₹${Number(venue.maximum_price).toLocaleString("en-IN")}`
                  : `From ₹${Number(venue.starting_price).toLocaleString("en-IN")}`,
            }
          : {}),
      },

      // BreadcrumbList
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: venue.city, item: `${SITE_URL}/${city}` },
          { "@type": "ListItem", position: 3, name: category.replace(/-/g, " "), item: `${SITE_URL}/${city}/${category}` },
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

// ─────────────────────────────────────────────
// 2. City + Category Page  - ItemList + BreadcrumbList
// ─────────────────────────────────────────────
export function CityListSchema({ vendors = [], city, cityLabel, category, categoryLabel }) {
  const pageUrl = `${SITE_URL}/${city}/${category}`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      // ItemList of vendors
      {
        "@type": "ItemList",
        name: `${categoryLabel} in ${cityLabel}`,
        url: pageUrl,
        numberOfItems: vendors.length,
        itemListElement: vendors.slice(0, 20).map((v, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: v.hall_name,
          url: `${SITE_URL}/${city}/${category}/${v.slug || v.venue_slug}`,
        })),
      },

      // BreadcrumbList
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: cityLabel, item: `${SITE_URL}/${city}` },
          { "@type": "ListItem", position: 3, name: categoryLabel, item: pageUrl },
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

// ─────────────────────────────────────────────
// 3. Generic BreadcrumbList  - reusable for any page
// ─────────────────────────────────────────────
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