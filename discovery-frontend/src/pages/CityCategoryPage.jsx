import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import api from "../lib/api";
import BreadcrumbNav from "../components/seo/BreadcrumbNav";
import FilterSidebar from "../components/search/FilterSidebar";
import ResultsGrid from "../components/search/ResultsGrid";
import { CityListSchema } from "../components/seo/SchemaMarkup";
import { FAQSchema } from "../lib/seo/Schema";
import { BASE_DOMAIN } from "../lib/constants";

export default function CityCategoryPage() {
  const { city, category } = useParams();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get(`/city/${city}/category/${category}`, { params: { page } }).then(({ data }) => setData(data.data));
  }, [city, category, page]);

  if (!data) return <div className="max-w-6xl mx-auto px-4 py-16 text-gray-400">Loading...</div>;

  const canonicalUrl = `https://www.${BASE_DOMAIN}/${city}/${category}`;
  const faqSchemaItems = (data.faq || []).map((f) => ({ question: f.q, answer: f.a }));

  return (
    <>
      <Helmet>
        <title>{data.seo.title}</title>
        <meta name="description" content={data.seo.description} />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

      <CityListSchema
        vendors={data.vendors}
        city={city}
        cityLabel={data.city_name}
        category={category}
        categoryLabel={data.category.name}
      />
      <FAQSchema items={faqSchemaItems} />

      <BreadcrumbNav items={[{ label: data.city_name, to: `/${city}` }, { label: data.category.name }]} />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Best {data.category.name} in {data.city_name}</h1>
        <p className="text-sm text-gray-500 mb-6 max-w-3xl">{data.intro}</p>

        <div className="flex flex-col md:flex-row gap-6">
          <FilterSidebar filters={{ city, category }} onChange={() => {}} />
          <div className="flex-1">
            <ResultsGrid vendors={data.vendors} page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
          </div>
        </div>

        {data.faq?.length > 0 && (
          <div className="mt-10 border-t border-gray-100 pt-6">
            <h2 className="font-semibold text-gray-800 mb-3">Frequently Asked Questions</h2>
            {data.faq.map((f, i) => (
              <div key={i} className="mb-3">
                <p className="text-sm font-medium text-gray-700">{f.q}</p>
                <p className="text-sm text-gray-500">{f.a}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}