import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Search } from "lucide-react";
import { BRAND_NAME } from "../lib/constants";

export default function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>Page Not Found | {BRAND_NAME}</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <Search size={40} className="mx-auto mb-4 text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Page Not Found</h1>
        <p className="text-sm text-gray-500 mb-6">
          The page you are looking for does not exist or may have moved.
        </p>
        <Link
          to="/"
          className="inline-block bg-primary-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-700"
        >
          Go to Homepage
        </Link>
      </div>
    </>
  );
}