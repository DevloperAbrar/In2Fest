import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { BASE_DOMAIN, BRAND_NAME } from "../../lib/constants";

const COMPANY = "Campussafar Technologies Private Limited";
const CONTACT_PHONE = "+91 77709 72867";
const LAST_UPDATED = "12 October 2026";

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">{title}</h2>
      <div className="text-sm text-gray-600 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

function List({ items }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | {BRAND_NAME}</title>
        <meta
          name="description"
          content={`How ${BRAND_NAME} collects, uses, stores and protects your personal information.`}
        />
        <link rel="canonical" href={`https://${BASE_DOMAIN}/privacy`} />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Privacy Policy</h1>
        <p className="text-xs text-gray-400 mb-8">Last updated: {LAST_UPDATED}</p>

        <Section title="1. Introduction">
          <p>
            {BRAND_NAME} (in2fest.com) is operated by {COMPANY} ("we", "us", "our"). {BRAND_NAME} is a
            platform where customers can find and contact local businesses and vendors, and where business
            owners can list their business, get a website, manage bookings and send bills.
          </p>
          <p>
            This Privacy Policy explains what personal information we collect, why we collect it, how we use
            and protect it, and the choices you have. By using {BRAND_NAME} or submitting your details to us,
            you agree to this policy.
          </p>
        </Section>

        <Section title="2. Information we collect">
          <p>Depending on how you use {BRAND_NAME}, we may collect:</p>
          <List
            items={[
              "Contact details: your name, phone number, email address and city.",
              "Business details (for vendors): business name, category, address, services, pricing, photos, GST number and other details you add to your listing or website.",
              "Account and sign-in details: login information, including when you sign in with Google, and one-time passcodes (OTP) sent to verify your phone number.",
              "Enquiry and booking details: messages, enquiries, bookings, reviews and ratings you submit.",
              "Payment details: payments are processed by Razorpay. We do not store your full card, UPI or bank details.",
              "Details you submit through our advertising lead forms on Facebook or Instagram, such as your name, phone number, email, business type and city.",
              "Technical information: device type, browser, IP address, pages visited and similar usage data, collected through cookies and similar technologies.",
            ]}
          />
        </Section>

        <Section title="3. How we use your information">
          <List
            items={[
              "To create and manage your account and verify your phone number.",
              "To list vendors, show their profiles and connect customers with vendors.",
              "To contact you about your registration, free listing, enquiry or booking, including by phone call, SMS, email and WhatsApp.",
              "To provide vendor tools such as the website builder, booking calendar, GST billing, notifications and analytics.",
              "To process payments and prevent fraud and misuse.",
              "To improve our platform, measure how it is used and show relevant advertising of our own services.",
              "To comply with legal obligations and resolve disputes.",
            ]}
          />
        </Section>

        <Section title="4. Cookies, Meta Pixel and advertising">
          <p>
            We use cookies and similar technologies to keep you signed in, understand how the site is used and
            measure our advertising. We use the Meta Pixel, which lets Meta (Facebook and Instagram) receive
            information about visits to our website and actions taken on it, so that we can measure and improve
            our ads. You can control cookies in your browser settings and manage ad preferences in your
            Facebook and Instagram account settings.
          </p>
        </Section>

        <Section title="5. Who we share information with">
          <p>We do not sell your personal information. We share it only as needed:</p>
          <List
            items={[
              "With vendors: when you send an enquiry or booking, your details are shared with that vendor so they can respond.",
              "With service providers who help us run the platform, such as payment processing (Razorpay), sign-in (Google), messaging (WhatsApp, SMS), cloud hosting and storage, and analytics and advertising (Meta).",
              "When required by law, court order or a government authority.",
              "In connection with a merger, acquisition or sale of our business, with notice to you where required.",
            ]}
          />
        </Section>

        <Section title="6. Data retention and security">
          <p>
            We keep your information only for as long as needed for the purposes above or as required by law.
            We use reasonable technical and organisational measures to protect your information. No online
            service can be completely secure, so we cannot guarantee absolute security.
          </p>
        </Section>

        <Section title="7. Your choices and rights">
          <p>
            Subject to applicable law, including the Digital Personal Data Protection Act, 2023, you can ask us
            to:
          </p>
          <List
            items={[
              "Tell you what personal information we hold about you.",
              "Correct or update inaccurate information.",
              "Delete your information or close your account.",
              "Stop sending you calls, messages or promotional communication.",
              "Withdraw consent you have given us.",
            ]}
          />
          <p>
            To make a request, contact us using the details below. We may need to verify your identity before
            acting on it.
          </p>
        </Section>

        <Section title="8. Children">
          <p>
            {BRAND_NAME} is meant for adults. We do not knowingly collect personal information from anyone under
            18 years of age. If you believe a child has given us information, please contact us and we will
            delete it.
          </p>
        </Section>

        <Section title="9. Links to other websites">
          <p>
            Our platform may link to websites and social pages of vendors and third parties. We are not
            responsible for their privacy practices, so please read their policies separately.
          </p>
        </Section>

        <Section title="10. Changes to this policy">
          <p>
            We may update this policy from time to time. The latest version will always be available on this
            page, with the date it was last updated shown at the top.
          </p>
        </Section>

        <Section title="11. Contact us">
          <p>For any question about this policy or your personal information, contact:</p>
          <p>
            {COMPANY}
            <br />
            Phone / WhatsApp: {CONTACT_PHONE}
            <br />
            Contact page:{" "}
            <Link to="/contact" className="text-red-600 hover:underline">
              {BASE_DOMAIN}/contact
            </Link>
          </p>
        </Section>
      </div>
    </>
  );
}