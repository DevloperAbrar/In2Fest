import React from "react";
import { Helmet } from "react-helmet-async";

const TYPE = { gym: "HealthClub", food: "Restaurant", shops: "Store", events: "EventVenue" };

export default function VerticalSchema({ venue, vertical, attrs = {}, showRating, url }) {
  const data = {
    "@context": "https://schema.org",
    "@type": TYPE[vertical?.key] || "LocalBusiness",
    name: venue.hall_name,
    url,
    image: venue.hero_image_url || undefined,
    description: (venue.long_description || "").slice(0, 300) || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: venue.primary_locality || undefined,
      addressLocality: venue.city,
      postalCode: venue.full_pincode || undefined,
      addressCountry: "IN"
    },
    priceRange: venue.starting_price ? `From ₹${venue.starting_price}` : undefined
  };

  if (vertical?.key === "food" && Array.isArray(attrs.cuisines) && attrs.cuisines.length) {
    data.servesCuisine = attrs.cuisines;
  }
  if (showRating && Number(venue.review_count) > 0 && Number(venue.average_rating) > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(venue.average_rating),
      reviewCount: Number(venue.review_count)
    };
  }

  // "<" is escaped so vendor text can never close the script tag.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <Helmet>
      <script type="application/ld+json">{json}</script>
    </Helmet>
  );
}