import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import api from "../lib/api";
import BreadcrumbNav from "../components/seo/BreadcrumbNav";
import FilterSidebar from "../components/search/FilterSidebar";
import ResultsGrid from "../components/search/ResultsGrid";
import { CityListSchema } from "../components/seo/SchemaMarkup";
import { FAQSchema } from "../lib/seo/Schema";
import { BASE_DOMAIN } from "../lib/constants";
import PageLoader from "../components/common/PageLoader";
import NotFoundPage from "./NotFoundPage";

// /:city/:category  (all vendors of a category)
// /:city/:category/:typeSlug  (one business type, for example CCTV dealers under Other Business)
export default function CityCategoryPage({ typeSlug }) {
  const { city, category } = useParams();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setNotFound(false);
    api
      .get(`/city/${city}/category/${category}`, { params: { page, type: typeSlug || undefined } })
      .then(({ data }) => setData(data.data))
      .catch(() => setNotFound(true));
  }, [city, category, typeSlug, page]);

  if (notFound) return <NotFoundPage />;
  if (!data) return <PageLoader />;

  const subject = data.business_type ? data.business_type.label : data.category.name;
  const canonicalUrl = `https://${BASE_DOMAIN}/${city}/${category}${typeSlug ? `/${typeSlug}` : ""}`;
  const faqSchemaItems = (data.faq || []).map((f) => ({ question: f.q, answer: f.a }));

  const crumbs = [{ label: data.city_name, to: `/${city}` }];
  if (data.business_type) {
    crumbs.push({ label: data.category.name, to: `/${city}/${category}` }, { label: subject });
  } else {
    crumbs.push({ label: data.category.name });
  }

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
        categoryLabel={subject}
      />
      <FAQSchema items={faqSchemaItems} />

      <BreadcrumbNav items={crumbs} />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Best {subject} in {data.city_name}</h1>
        <p className="text-sm text-gray-500 mb-4 max-w-3xl">{data.intro}</p>

        {/* Every business type in this city, as real links so each type page can be found and indexed. */}
        {(data.type_facets || []).length > 0 && (
          <div className="mb-6">
            <p className="text-xs text-gray-400 mb-2">Browse by type of business</p>
            <div className="flex flex-wrap gap-2">
              {data.type_facets.map((t) => (
                <Link
                  key={t.slug}
                  to={`/${city}/${category}/${t.slug}`}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border bg-white text-gray-600 border-gray-200 hover:border-navy-300"
                >
                  {t.label} <span className="text-gray-400">({t.count})</span>
                </Link>
              ))}
            </div>
          </div>
        )}

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