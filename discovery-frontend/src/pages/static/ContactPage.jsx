import React from "react";
import { Helmet } from "react-helmet-async";
import { Mail, Phone } from "lucide-react";
import { BASE_DOMAIN, BRAND_NAME } from "../../lib/constants";

export default function ContactPage() {
  return (
    <>
      <Helmet>
        <title>Contact Us | {BRAND_NAME}</title>
        <meta name="description" content={`Get in touch with the ${BRAND_NAME} team for support, partnerships or vendor listing queries.`} />
        <link rel="canonical" href={`https://www.${BASE_DOMAIN}/contact`} />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Contact Us</h1>
        <div className="space-y-4 text-sm text-gray-600">
          <div className="flex items-center gap-3">
            <Mail size={18} className="text-primary-600" />
            <span>Replace with your real support email address</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone size={18} className="text-primary-600" />
            <span>Replace with your real support phone number</span>
          </div>
        </div>
      </div>
    </>
  );
}