import React from "react";
import { BRAND_NAME } from "../../lib/constants";

export const homeFaqItems = [
  {
    question: `What is ${BRAND_NAME}?`,
    answer: `${BRAND_NAME} is a platform to search, compare and directly contact verified banquet halls, marriage halls, decorators, caterers, photographers, DJs, mehndi artists, wedding planners and other wedding and event vendors near you.`
  },
  {
    question: `Is ${BRAND_NAME} also known as I2F or IntoFest?`,
    answer: `Yes. People search for us using different spellings such as I2F, IntoFest, In to Fest, In Two Fest and In 2 Fest. All of these refer to the same platform, ${BRAND_NAME}.`
  },
  {
    question: "Can I find an event management company near me?",
    answer: `Yes, ${BRAND_NAME} lists verified event management companies and wedding planners along with their pricing, reviews and contact details.`
  },
  {
    question: "Does In2Fest cover banquet halls, tent houses and singers for shaadi?",
    answer: `Yes, banquet halls, tent houses, live singers for weddings, mehndi artists and every other major wedding and event category are covered on ${BRAND_NAME}.`
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