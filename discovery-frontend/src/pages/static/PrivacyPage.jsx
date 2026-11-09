import React from "react";
import { Link } from "react-router-dom";
import LegalLayout, { List } from "../../components/legal/LegalLayout";
import { BASE_DOMAIN, BRAND_NAME } from "../../lib/constants";
import { LEGAL } from "../../lib/legalConfig";

export default function PrivacyPage() {
  const sections = [
    {
      id: "who-we-are",
      title: "Who we are",
      body: (
        <>
          <p>
            {BRAND_NAME} ({BASE_DOMAIN}) is operated by {LEGAL.company} (“we”, “us”, “our”). {BRAND_NAME} has two
            sides. Customers use it to find and contact local businesses. Business owners (“vendors”) use it to run
            daily operations, publish a website and get listed in our marketplace.
          </p>
          <p>
            This policy explains what personal information we collect, why we collect it, who we share it with and what
            choices you have. By using {BRAND_NAME} or sending us your details, you agree to this policy.
          </p>
        </>
      ),
    },
    {
      id: "our-role",
      title: "Our role: your data and your customers’ data",
      body: (
        <>
          <p>We handle two kinds of personal information, and our role is different for each.</p>
          <List
            items={[
              "Information about you (visitors, customers and vendor owners). For this we decide why and how the data is used, so we are responsible for it under this policy.",
              "Information a vendor adds about their own members, students, customers or staff, such as names, phone numbers, photos, attendance, plan and fee records, bills and salary records. The vendor decides why this data is collected and is responsible for having a lawful basis to collect it. We store and process it only on the vendor’s behalf, to provide the tools they use.",
            ]}
          />
          <p>
            If you are a member or customer of a vendor and want to see, correct or delete your information, please
            contact that vendor first. You can also write to us and we will help route your request.
          </p>
        </>
      ),
    },
    {
      id: "information-we-collect",
      title: "Information we collect",
      body: (
        <>
          <p>Depending on how you use {BRAND_NAME}, we may collect:</p>
          <List
            items={[
              "Contact details: name, phone number, email address and city.",
              "Account and sign-in details: login information, including Google sign-in, and one-time passcodes (OTP) used to verify your phone number.",
              "Business details (vendors): business name, category, address, services, prices, photos, videos, GST number, licence or registration details and anything else you add to your listing or website.",
              "Vendor tool data (vendors): members, students or customers, plans, renewals, attendance, shifts, staff and salary records, stock, bills, invoices and payment records. Photos used on membership cards are included.",
              "Enquiries, reviews and ratings you submit, and the messages we send on a vendor’s behalf.",
              "Payment details: payments are processed by Razorpay and other payment partners. We do not store your full card number, UPI PIN or bank login.",
              "Details you give through our advertising lead forms on Facebook or Instagram, such as name, phone number, email, business type and city.",
              "Technical information: device, browser, IP address, pages visited and similar usage data, collected through cookies and similar technologies.",
            ]}
          />
        </>
      ),
    },
    {
      id: "how-we-use",
      title: "How we use information",
      body: (
        <List
          items={[
            "To create and secure your account and verify your phone number.",
            "To list vendors, show their profiles and websites and connect customers with them.",
            "To provide vendor tools: billing and GST invoices, member and plan management, attendance, stock, website builder, reminders and analytics.",
            "To send bills, membership cards, reminders and enquiries on WhatsApp, SMS or email when you or the vendor asks us to.",
            "To contact you about your registration, listing, plan, payment or support request.",
            "To process payments, verify businesses and prevent fraud and misuse.",
            "To improve the platform, measure usage and promote our own services.",
            "To meet legal obligations and resolve disputes.",
          ]}
        />
      ),
    },
    {
      id: "whatsapp",
      title: "WhatsApp, SMS and calls",
      body: (
        <>
          <p>
            Customers contact vendors directly on WhatsApp or by phone. When you tap a WhatsApp or call button on a
            vendor’s page, the conversation takes place between you and the vendor, and WhatsApp’s own terms and
            privacy policy apply.
          </p>
          <p>
            Vendors can send bills and cards through WhatsApp. Vendors must only message people who have given them
            their number for that purpose. You can ask a vendor, or us, to stop messaging you at any time.
          </p>
        </>
      ),
    },
    {
      id: "cookies",
      title: "Cookies, Meta Pixel and advertising",
      body: (
        <p>
          We use cookies and similar technologies to keep you signed in, understand how the site is used and measure
          our advertising. We use the Meta Pixel, which lets Meta (Facebook and Instagram) receive information about
          visits to our website and actions taken on it, so we can measure and improve our ads. You can control cookies
          in your browser settings and manage ad preferences in your Facebook and Instagram account settings.
        </p>
      ),
    },
    {
      id: "sharing",
      title: "Who we share information with",
      body: (
        <>
          <p>We do not sell your personal information. We share it only as needed:</p>
          <List
            items={[
              "With vendors: when you send an enquiry, write a review or contact a business through our platform, your details are shared with that vendor so they can respond.",
              "With service providers that help us run the platform, such as Razorpay (payments), Google (sign-in), WhatsApp and SMS providers (messaging), cloud hosting and storage, and Meta (analytics and advertising).",
              "Publicly: a vendor’s business profile, photos, prices and reviews are visible to anyone. Reviews show the reviewer’s name as entered.",
              "With authorities when required by law, court order or a government request.",
              "In a merger, acquisition or sale of our business, with notice to you where required.",
            ]}
          />
        </>
      ),
    },
    {
      id: "retention",
      title: "How long we keep information",
      body: (
        <>
          <p>
            We keep information for as long as your account is active and as needed to provide the service, meet legal
            and tax obligations (for example billing records), resolve disputes and enforce our agreements.
          </p>
          <p>
            When a vendor closes an account, we delete or anonymise their data after a reasonable period unless the law
            requires us to keep it. Vendors can ask us for a copy of their member and billing data before closing.
          </p>
        </>
      ),
    },
    {
      id: "security",
      title: "Security",
      body: (
        <p>
          We use reasonable technical and organisational measures to protect your information, including access
          controls, encrypted connections and regular backups. No online service is completely secure, so we cannot
          guarantee absolute security. Please keep your login and OTP private and tell us at once if you suspect misuse.
        </p>
      ),
    },
    {
      id: "your-rights",
      title: "Your rights",
      body: (
        <>
          <p>
            Subject to applicable law, including the Digital Personal Data Protection Act, 2023, you can ask us to:
          </p>
          <List
            items={[
              "Tell you what personal information we hold about you.",
              "Correct or update information that is wrong or incomplete.",
              "Delete your information or close your account.",
              "Stop calls, messages or promotional communication.",
              "Withdraw a consent you gave us.",
              "Nominate someone to exercise these rights on your behalf if you are unable to.",
            ]}
          />
          <p>
            To make a request, contact us using the details below. We may need to verify your identity first and will
            respond within the time required by law.
          </p>
        </>
      ),
    },
    {
      id: "children",
      title: "Children",
      body: (
        <p>
          {BRAND_NAME} is meant for adults. We do not knowingly collect personal information from anyone under 18. A
          vendor such as a gym, academy or library may record details of a minor member with the consent of a parent or
          guardian, and is responsible for doing so. If you believe a child has given us information without a
          guardian’s consent, contact us and we will delete it.
        </p>
      ),
    },
    {
      id: "links",
      title: "Links to other websites",
      body: (
        <p>
          Vendor websites, social pages and other third-party links may appear on our platform. We are not responsible
          for their privacy practices, so please read their policies separately.
        </p>
      ),
    },
    {
      id: "changes",
      title: "Changes to this policy",
      body: (
        <p>
          We may update this policy from time to time. The latest version is always on this page with the date it was
          last updated. If a change is significant, we will tell vendors by email, WhatsApp or inside the app.
        </p>
      ),
    },
    {
      id: "contact",
      title: "Contact and grievances",
      body: (
        <>
          <p>For any question about this policy, or to raise a privacy complaint, contact our grievance officer:</p>
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
            <br />
            Contact page:{" "}
            <Link to="/contact" className="text-accent-600 hover:underline">
              {BASE_DOMAIN}/contact
            </Link>
          </p>
          <p>We aim to acknowledge complaints within 48 hours and resolve them within 30 days.</p>
        </>
      ),
    },
  ];

  return (
    <LegalLayout
      kind="privacy"
      title="Privacy Policy"
      path="/privacy"
      description={`How ${BRAND_NAME} collects, uses, shares and protects personal information of customers and business owners.`}
      intro={
        <p>
          Your privacy matters to us. This policy covers {BRAND_NAME} for customers who search for businesses and for
          vendors who run their business on our platform.
        </p>
      }
      sections={sections}
    />
  );
}