import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import api from "../lib/api";
import BreadcrumbNav from "../components/seo/BreadcrumbNav";

export default function CityOrStatePage() {
  const { slug } = useParams();
  const [type, setType] = useState(null); // 'city' | 'state' | 'notfound'
  const [data, setData] = useState(null);

  useEffect(() => {
    setType(null);
    api.get(`/city/${slug}`)
      .then(({ data }) => { setType("city"); setData(data.data); })
      .catch(() => {
        api.get(`/state/${slug}`)
          .then(({ data }) => { setType("state"); setData(data.data); })
          .catch(() => setType("notfound"));
      });
  }, [slug]);

  if (!type) return <div className="max-w-6xl mx-auto px-4 py-16 text-gray-400">Loading...</div>;
  if (type === "notfound") return <div className="max-w-6xl mx-auto px-4 py-16 text-gray-400">Page not found.</div>;

  if (type === "city") {
    return (
      <>
        <Helmet>
          <title>{data.seo.title}</title>
          <meta name="description" content={data.seo.description} />
        </Helmet>
        <BreadcrumbNav items={[{ label: data.city_name }]} />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Wedding & Event Services in {data.city_name}</h1>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {data.categories.map((c) => (
              <Link key={c.slug} to={`/${slug}/${c.slug}`} className="bg-white border border-gray-100 rounded-xl p-4 text-center hover:border-primary-300">
                <p className="font-medium text-gray-800 text-sm">{c.name}</p>
                <p className="text-xs text-gray-400">{c.vendor_count} vendors</p>
              </Link>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet><title>Wedding and Event Services in {data.state} - In2Fest</title></Helmet>
      <BreadcrumbNav items={[{ label: data.state }]} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Cities in {data.state}</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {data.cities.map((c) => (
            <Link key={c.slug} to={`/${c.slug}`} className="bg-white border border-gray-100 rounded-xl p-4 text-center hover:border-primary-300">
              <p className="font-medium text-gray-800 text-sm">{c.name}</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}