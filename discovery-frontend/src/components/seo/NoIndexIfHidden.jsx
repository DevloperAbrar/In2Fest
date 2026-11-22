import React from "react";
import { Helmet } from "react-helmet-async";
import useCategories from "../search/useCategories";

// Listing pages of HIDDEN categories stay open for existing vendors and their links,
// but search engines are told not to index them.
export default function NoIndexIfHidden({ slug }) {
  const { categories, loading } = useCategories();
  if (loading) return null;
  const cat = categories.find((c) => c.slug === slug);
  if (!cat || cat.isLive) return null;
  return (
    <Helmet>
      <meta name="robots" content="noindex,follow" />
    </Helmet>
  );
}