import React from "react";
import { BRAND_NAME } from "../../lib/constants";

export const homeFaqItems = [
  {
    question: `What is ${BRAND_NAME}?`,
    answer: `${BRAND_NAME} is a platform to search, compare and directly contact verified local businesses and vendors near you: coaching classes, schools, gyms, clinics, salons, shops, restaurants, repair services, and wedding and event vendors.`
  },
  {
    question: `Is ${BRAND_NAME} also written as In 2 Fest, In Two Fest or Intwofest?`,
    answer: `Yes. People write our name in different ways such as In 2 Fest, In Two Fest, Intwofest, I2F or IntoFest. All of these refer to the same platform, ${BRAND_NAME}, at in2fest.com.`
  },
  {
    question: `Is it free to list my business on ${BRAND_NAME}?`,
    answer: `Yes. Listing is free, and you also get a free branded website, a booking calendar and billing tools. You can upgrade later if you need more.`
  },
  {
    question: "Do I pay a commission to contact a vendor?",
    answer: `No. You contact vendors directly on call or WhatsApp. ${BRAND_NAME} does not take a commission from customers or sit in the middle of your deal.`
  },
  {
    question: "How are vendors verified?",
    answer: "Every business submits proof and documents, our team reviews them, and only then the profile goes live. Ratings come from real customers, not paid placements."
  }
];

export default function HomeFAQ() {
  return (
    <section className="max-w-4xl mx-auto px-4 py-12">
      <h2 className="text-2xl font-display font-bold text-navy-900 mb-6">Frequently Asked Questions</h2>
      <div className="space-y-4">
        {homeFaqItems.map((item, i) => (
          <details key={i} className="bg-white border border-gray-100 rounded-xl p-4 group">
            <summary className="font-medium text-gray-800 cursor-pointer list-none flex justify-between items-center">
              {item.question}
              <span className="text-gray-400 group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="text-sm text-gray-500 mt-3 leading-relaxed">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}