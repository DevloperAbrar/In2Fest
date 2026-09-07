import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../lib/api";
import VendorProfilePage from "./VendorProfilePage";
import CityCategoryLocalityPage from "./CityCategoryLocalityPage";

export default function ThirdSegmentResolver() {
  const { city, category, slug } = useParams();
  const [type, setType] = useState(null);

  useEffect(() => {
    setType(null);
    api.get(`/resolve/${city}/${category}/${slug}`).then(({ data }) => setType(data.data.type));
  }, [city, category, slug]);

  if (!type) return <div className="max-w-6xl mx-auto px-4 py-16 text-gray-400">Loading...</div>;
  return type === "vendor" ? <VendorProfilePage /> : <CityCategoryLocalityPage />;
}