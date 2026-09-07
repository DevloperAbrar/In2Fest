import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import api from "../lib/api";
import BreadcrumbNav from "../components/seo/BreadcrumbNav";
import { BASE_DOMAIN, BRAND_NAME } from "../lib/constants";

export default function CitiesIndexPage() {
  const [states, setStates] = useState(null);

  useEffect(() => {
    api.get("/states").then(({ data }) => setStates(data.data));
  }, []);

  return (
    <>
      <Helmet>
        <title>All Cities We Cover | {BRAND_NAME}</title>
        <meta name="description" content={`Find verified wedding and event vendors across every city covered by ${BRAND_NAME}.`} />
        <link rel="canonical" href={`https://www.${BASE_DOMAIN}/cities`} />
      </Helmet>

      <BreadcrumbNav items={[{ label: "Cities" }]} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Explore by City</h1>
        <p className="text-sm text-gray-500 mb-8 max-w-2xl">
          {BRAND_NAME} is expanding city by city. Pick a state below to see the cities we currently cover.
        </p>

        {!states ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {states.map((s) => (
              <Link
                key={s.state_slug}
                to={`/${s.state_slug}`}
                className="bg-white border border-gray-100 rounded-xl p-4 hover:border-primary-300 hover:shadow-sm transition-all"
              >
                <p className="text-sm font-medium text-gray-700">{s.state}</p>
                <p className="text-xs text-gray-400 mt-1">{s.city_count} {s.city_count === 1 ? "city" : "cities"}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}