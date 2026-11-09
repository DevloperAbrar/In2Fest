import React from "react";
import {
  BadgeCheck, MapPin, Star, MessageCircle, Percent, Search, UserPlus, ShieldCheck, Layers, FileCheck2, Users, PhoneCall,
} from "lucide-react";
import PillarPage, { FoundVisual, APP_URL } from "../components/vendor/VendorKit";

const SEO = {
  title: "Get Found by Local Customers | Free Marketplace Listing on In2Fest",
  description:
    "List your business free on the In2Fest marketplace. Get a verified profile, appear in your city and category, collect reviews and receive enquiries directly. No commission.",
};

const HERO = {
  title: "Get found by",
  mark: "customers near you.",
  sub: "A verified profile in the In2Fest marketplace puts your business in front of people searching your category in your city. Enquiries come straight to you.",
  primary: { to: "/join", label: "List for free" },
  secondary: { href: `${APP_URL}/login`, label: "Already listed? Log in" },
  bullets: ["Free to list", "No commission", "Verified badge on approval"],
  chips: [
    { icon: BadgeCheck, bg: "#DDF3E8", color: "#0f8a5f", title: "Verified", sub: "Sample · badge on approval" },
    { icon: MessageCircle, bg: "#25D366", color: "#fff", title: "New enquiry", sub: "Sample · on WhatsApp" },
  ],
  visual: <FoundVisual />,
};

const FEATURES = {
  eyebrow: "What the marketplace does",
  title: "Be easy to find, easy to trust, easy to contact.",
  sub: "Customers can compare, check reviews and reach you without a middleman.",
  items: [
    [BadgeCheck, "Verified profile", "Our team reviews your business details. Approved profiles get a verified badge.", "#DDF3E8"],
    [FileCheck2, "Documents-verified badge", "Show customers that your documents have been checked.", "#E0EAFF"],
    [Search, "City and category pages", "You appear when people search your category in your city.", "#FFF0C2"],
    [Star, "Real customer reviews", "Genuine reviews on your profile help new people choose you.", "#FFE6D6"],
    [PhoneCall, "Enquiries reach you directly", "Customers call or message you. Nothing goes through a middleman.", "#DDF3E8"],
    [Percent, "No commission", "We do not take a cut of what your customers pay you.", "#FFE0E3"],
    [Layers, "Prices and availability", "Customers can see what you offer and compare before they visit.", "#E0EAFF"],
    [MapPin, "Local first", "Built for customers searching nearby, not for the whole country at once.", "#FFF0C2"],
    [Users, "Included with your website", "Every vendor website also gets a marketplace profile automatically.", "#FFE6D6"],
  ],
  who: {
    label: "Listed on the marketplace",
    items: ["Gyms and fitness", "Restaurants and food", "Shops and retail", "Pharmacies", "Coaching", "Marriage halls and events"],
  },
};

const STEPS = {
  eyebrow: "How it works",
  title: "From a free listing to your first enquiry.",
  steps: [
    [UserPlus, "Apply for a free listing", "Fill the short form. It takes about two minutes."],
    [ShieldCheck, "We review and approve", "Our team checks your details and confirms on WhatsApp."],
    [Search, "Get discovered", "Customers in your city find you when they search your category."],
    [MessageCircle, "Receive enquiries", "People contact you directly by call or WhatsApp."],
  ],
};

const FAQ = [
  ["Is it really free to list my business?", "Yes. Creating your profile and getting listed on In2Fest is free."],
  ["Do I pay a commission on customers?", "No. Customers contact you directly, and we do not take a commission on them."],
  ["How does verification work?", "Our team reviews the business details you submit. Once approved, your profile gets the verified badge."],
  ["How do customers reach me?", "Enquiries reach you directly, so customers can call or message you without anyone in between."],
  ["Do I need a website to be listed?", "No. You can start with a free listing. If you also get a website, it comes with a marketplace profile."],
];

const CTA = {
  title: "Ready to be found?",
  accent: "List for free.",
  sub: "Join the marketplace and start getting enquiries from customers near you.",
  primary: { to: "/join", label: "List your business free" },
  secondary: { href: `${APP_URL}/login`, label: "Already listed? Log in" },
};

export default function FoundItPage() {
  return (
    <PillarPage
      pillarKey="found"
      seo={SEO}
      hero={HERO}
      marquee={["Verified profile", "City pages", "Category pages", "Reviews", "Direct enquiries", "No commission", "Free listing"]}
      features={FEATURES}
      steps={STEPS}
      faq={FAQ}
      cta={CTA}
    />
  );
}