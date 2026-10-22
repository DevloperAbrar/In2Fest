import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../lib/api";
import VendorProfilePage from "./VendorProfilePage";
import CityCategoryLocalityPage from "./CityCategoryLocalityPage";
import CityCategoryPage from "./CityCategoryPage";
import PageLoader from "../components/common/PageLoader";

// /:city/:category/:slug can be a vendor, a business type (Other Business) or a locality.
export default function ThirdSegmentResolver() {
  const { city, category, slug } = useParams();
  const [type, setType] = useState(null);

  useEffect(() => {
    setType(null);
    api
      .get(`/resolve/${city}/${category}/${slug}`)
      .then(({ data }) => setType(data.data.type))
      .catch(() => setType("locality"));
  }, [city, category, slug]);

  if (!type) return <PageLoader />;
  if (type === "vendor") return <VendorProfilePage />;
  if (type === "business_type") return <CityCategoryPage typeSlug={slug} />;
  return <CityCategoryLocalityPage />;
}