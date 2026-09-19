import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../lib/api";
import VendorProfilePage from "./VendorProfilePage";
import CityCategoryLocalityPage from "./CityCategoryLocalityPage";
import PageLoader from "../components/common/PageLoader";

export default function ThirdSegmentResolver() {
  const { city, category, slug } = useParams();
  const [type, setType] = useState(null);

  useEffect(() => {
    setType(null);
    api.get(`/resolve/${city}/${category}/${slug}`).then(({ data }) => setType(data.data.type));
  }, [city, category, slug]);

  if (!type) return <PageLoader />;
  return type === "vendor" ? <VendorProfilePage /> : <CityCategoryLocalityPage />;
}