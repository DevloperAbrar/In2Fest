import React from "react";
import { Link } from "react-router-dom";
import LegalLayout, { List } from "../../components/legal/LegalLayout";
import { BASE_DOMAIN, BRAND_NAME } from "../../lib/constants";
import { LEGAL } from "../../lib/legalConfig";

export default function TermsPage() {
  const sections = [
    {
      id: "acceptance",
      title: "Acceptance of these terms",
      body: (
        <>
          <p>
            These Terms of Service (“Terms”) are an agreement between you and {LEGAL.company} (“we”, “us”), which
            operates {BRAND_NAME} at {BASE_DOMAIN}, the vendor web app and our mobile apps (together, the “Platform”).
          </p>
          <p>
            By browsing the Platform, creating an account, listing a business or buying a plan, you agree to these Terms
            and to our{" "}
            <Link to="/privacy" className="text-accent-600 hover:underline">
              Privacy Policy
            </Link>
            . If you do not agree, please do not use the Platform.
          </p>
        </>
      ),
    },
    {
      id: "what-we-offer",
      title: "What the Platform does",
      body: (
        <>
          <p>{BRAND_NAME} provides three things:</p>
          <List
            items={[
              "Run it: business software for vendors, such as billing and GST invoices, members and plans, attendance, stock and analytics.",
              "Get it: a website for the vendor on an in2fest.com address.",
              "Found it: a marketplace where customers can search verified local businesses by city and category and contact them directly.",
            ]}
          />
          <p>
            Some categories are live and others are marked “Launching soon”. Categories and features may change as we
            grow.
          </p>
        </>
      ),
    },
    {
      id: "marketplace-role",
      title: "Our role as a marketplace",
      body: (
        <>
          <p>
            {BRAND_NAME} is an intermediary. We help customers discover vendors and help vendors run and promote their
            business. We do not own, sell, supply or guarantee any vendor’s goods or services, and we are not a party to
            any arrangement between a customer and a vendor.
          </p>
          <p>
            Customers contact vendors directly by call or WhatsApp. Prices, availability, quality, delivery, refunds and
            any dispute are between the customer and the vendor. Please check details with the vendor before you pay or
            commit.
          </p>
          <p>
            We do not currently charge a commission on enquiries, bookings or sales between customers and vendors. If we
            add paid features such as online sales on vendor websites, we will tell vendors before they apply.
          </p>
        </>
      ),
    },
    {
      id: "accounts",
      title: "Accounts and eligibility",
      body: (
        <>
          <p>
            You must be at least 18 years old and able to enter into a binding contract to create an account or list a
            business. If you register for a business, you confirm that you are authorised to act for it.
          </p>
          <List
            items={[
              "Give accurate, current information and keep it up to date.",
              "Keep your login, OTP and device secure. You are responsible for everything done through your account.",
              "Tell us promptly if you think your account has been misused.",
              "Do not create accounts for businesses you do not own or represent, or create more than one account to avoid a restriction.",
            ]}
          />
        </>
      ),
    },
    {
      id: "vendor-terms",
      title: "Rules for vendors",
      body: (
        <>
          <p>If you list a business or use the vendor tools, you also agree to the following.</p>
          <List
            items={[
              "Everything in your listing and website, including name, address, prices, timings, photos, plans and offers, must be accurate and not misleading. Keep it current.",
              "You must hold all licences and registrations your business needs, for example GST, FSSAI for food, a drug licence for pharmacies, and any local trade licence. You are responsible for complying with the laws that apply to your business.",
              "Verification badges mean we checked the documents you gave us at the time. They are not a guarantee of quality, safety or legal compliance.",
              "You must have the right to use the photos, videos, logos and text you upload, and you must not upload anything that infringes anyone else’s rights.",
              "Respond to customer enquiries honestly and honour the prices and plans you publish.",
              "You are responsible for the bills, invoices, GST filings and records you create using the tools. We provide the software, not tax or legal advice. Please verify important figures with your accountant.",
            ]}
          />
        </>
      ),
    },
    {
      id: "vendor-customer-data",
      title: "Your members’ and customers’ data",
      body: (
        <>
          <p>
            When you add members, students, customers or staff to the Platform, you are responsible for having their
            permission to store their details and to contact them, including by WhatsApp, SMS or email. You decide how
            that data is used. We process it only to provide the service, as described in our Privacy Policy.
          </p>
          <List
            items={[
              "Collect and use personal data lawfully, and only for your business purposes.",
              "Do not send spam or unsolicited promotions through the Platform.",
              "Respond to your members’ requests to access, correct or delete their data.",
              "You can export your member and billing records, and you should do so before closing your account.",
            ]}
          />
        </>
      ),
    },
    {
      id: "plans-and-fees",
      title: "Plans, fees and payments",
      body: (
        <>
          <p>
            Listing your business on the marketplace is free. Some features, such as your own website and the business
            tools, need a paid plan. Plan prices, any one-time setup fee and what each plan includes are shown on the
            Platform or told to you before you pay.
          </p>
          <List
            items={[
              "Paid plans are charged for the period shown, for example one year, and renew only when you choose to renew.",
              "Prices are in Indian rupees. Applicable GST is added or included as shown at checkout.",
              "Payments are processed by Razorpay and our other payment partners. Their terms also apply.",
              "Except where we say otherwise at the time of purchase, or where the law requires, fees already paid are not refundable. If you believe you were charged in error, write to us and we will review it.",
              "We may change prices or plans for future periods. Changes do not affect a period you have already paid for.",
            ]}
          />
        </>
      ),
    },
    {
      id: "reviews",
      title: "Reviews and user content",
      body: (
        <>
          <p>
            Reviews must be honest and based on your own experience. Do not post fake or paid reviews, reviews about a
            business you own or work for, or content that is abusive, defamatory, hateful or unlawful.
          </p>
          <p>
            You keep ownership of the content you post. By posting it, you give us a free, worldwide licence to host,
            display, adapt and share it on the Platform and in our marketing for as long as it stays on the Platform. We
            may remove content that breaks these Terms or the law.
          </p>
        </>
      ),
    },
    {
      id: "acceptable-use",
      title: "Acceptable use",
      body: (
        <>
          <p>You agree not to:</p>
          <List
            items={[
              "Break any law, or use the Platform to cheat, defraud or harass anyone.",
              "List illegal, counterfeit, prohibited or unsafe goods or services.",
              "Scrape, copy or resell our data, or use bots or automated tools without our written permission.",
              "Interfere with the Platform, bypass security or try to reach another person’s account or data.",
              "Use the Platform to send spam, malware or misleading messages.",
              "Pretend to be another person or business, or misuse a verification badge.",
            ]}
          />
        </>
      ),
    },
    {
      id: "intellectual-property",
      title: "Intellectual property",
      body: (
        <p>
          The Platform, including its software, design, logos and the {BRAND_NAME} name, belongs to us or our licensors
          and is protected by law. We give you a limited, non-exclusive, non-transferable right to use it as allowed by
          these Terms. Websites we build for vendors use our templates and software; the vendor’s own content stays the
          vendor’s.
        </p>
      ),
    },
    {
      id: "third-parties",
      title: "Third-party services and links",
      body: (
        <p>
          The Platform works with third parties such as WhatsApp, Google, Razorpay and hosting providers, and links to
          vendor websites and social pages. We do not control these services and are not responsible for them or for
          their availability, content or policies.
        </p>
      ),
    },
    {
      id: "availability",
      title: "Availability and changes",
      body: (
        <p>
          We work to keep the Platform running, but we do not promise that it will always be available or error-free.
          We may update, change or discontinue features, and we may carry out maintenance. We will try to give notice of
          major changes that affect paying vendors.
        </p>
      ),
    },
    {
      id: "suspension",
      title: "Suspension and termination",
      body: (
        <>
          <p>
            You may stop using the Platform and close your account at any time. We may suspend, restrict or remove an
            account, listing or content, with or without notice, if you break these Terms, provide false information,
            misuse the Platform, put others at risk, or if the law requires.
          </p>
          <p>
            Sections that by nature should continue after termination, such as those on intellectual property,
            disclaimers, liability and disputes, will continue to apply.
          </p>
        </>
      ),
    },
    {
      id: "disclaimer",
      title: "Disclaimer",
      body: (
        <p>
          The Platform is provided “as is” and “as available”. To the extent the law allows, we do not give any warranty
          about the accuracy of vendor information, the quality of any vendor’s goods or services, or that the Platform
          will meet your needs. Calculations, reports and analytics are aids for your business and should be checked.
        </p>
      ),
    },
    {
      id: "liability",
      title: "Limitation of liability",
      body: (
        <>
          <p>
            To the extent the law allows, we are not liable for indirect, incidental or consequential loss, or for loss
            of profit, revenue, data or goodwill, or for anything a vendor or other user does or fails to do.
          </p>
          <p>
            Our total liability to you for any claim related to the Platform will not exceed the amount you paid us in
            the twelve months before the claim arose, or ₹5,000 if you have paid us nothing. Nothing in these Terms
            limits liability that cannot be limited by law.
          </p>
        </>
      ),
    },
    {
      id: "indemnity",
      title: "Indemnity",
      body: (
        <p>
          You agree to compensate us for losses, claims and costs, including reasonable legal fees, that arise from your
          breach of these Terms, your content, your business or your violation of any law or third-party right.
        </p>
      ),
    },
    {
      id: "governing-law",
      title: "Governing law and disputes",
      body: (
        <>
          <p>
            These Terms are governed by the laws of India. If a dispute arises, please write to us first so we can try to
            resolve it informally. If it is not resolved, the courts at {LEGAL.jurisdiction} have exclusive jurisdiction,
            subject to any mandatory rights you have under consumer protection law.
          </p>
        </>
      ),
    },
    {
      id: "changes",
      title: "Changes to these Terms",
      body: (
        <p>
          We may update these Terms from time to time. The latest version is always on this page with its date. If you
          keep using the Platform after a change takes effect, you accept the updated Terms. For significant changes we
          will notify vendors by email, WhatsApp or inside the app.
        </p>
      ),
    },
    {
      id: "contact",
      title: "Contact and grievances",
      body: (
        <>
          <p>For questions about these Terms, or to report a complaint, content or a listing, contact:</p>
          <p>
            <strong className="text-navy-800">{LEGAL.grievanceOfficer}</strong>
            {LEGAL.address && (
              <>
                <br />
                {LEGAL.address}
              </>
            )}
            <br />
            Email:{" "}
            <a href={`mailto:${LEGAL.email}`} className="text-accent-600 hover:underline">
              {LEGAL.email}
            </a>
            <br />
            Phone / WhatsApp: {LEGAL.phone}
          </p>
          <p>We aim to acknowledge complaints within 48 hours and resolve them within 30 days.</p>
        </>
      ),
    },
  ];

  return (
    <LegalLayout
      kind="terms"
      title="Terms of Service"
      path="/terms"
      description={`The rules for using ${BRAND_NAME} as a customer or a vendor: listings, plans and fees, content, and responsibilities.`}
      intro={
        <p>
          Please read these Terms carefully. They explain how you may use {BRAND_NAME}, what vendors and customers are
          responsible for, and how plans and payments work.
        </p>
      }
      sections={sections}
    />
  );
}