import React from "react";
import {
  Globe, Smartphone, Boxes, MessageCircle, IdCard, Palette, MapPin, Star, UserPlus, Wrench, Rocket, BadgeCheck, Zap,
} from "lucide-react";
import PillarPage, { GetVisual, APP_URL } from "../components/vendor/VendorKit";

const SEO = {
  title: "Get Your Own Business Website in a Day | Get it with In2Fest",
  description:
    "Get a branded website for your gym, shop, restaurant or academy on your own in2fest.com address. Catalogue, WhatsApp buttons, gallery, reviews and a marketplace profile included.",
};

const HERO = {
  title: "Your own website,",
  mark: "live in a day.",
  sub: "A professional website with your name, services and contact details, built from your profile. No developer and no hosting to manage.",
  primary: { href: `${APP_URL}/login`, label: "Get my website" },
  secondary: { to: "/get-website", label: "See the templates" },
  bullets: ["Your own in2fest.com address", "Works on every phone", "Switch templates anytime"],
  chips: [
    { icon: Zap, bg: "#f5a623", title: "Live in a day", sub: "Branded website" },
    { icon: MessageCircle, bg: "#25D366", color: "#fff", title: "New enquiry", sub: "Sample · from your site" },
  ],
  visual: <GetVisual />,
};

const FEATURES = {
  eyebrow: "What your website has",
  title: "Everything a customer wants to see.",
  sub: "Your website is ready from the details you already added to your profile.",
  items: [
    [Globe, "A branded website", "Your business name, services, timings and contact details on your own address.", "#E0EAFF"],
    [Boxes, "Product and service catalogue", "Show what you sell or offer, so new customers can compare before they call.", "#FFF0C2"],
    [MessageCircle, "WhatsApp and enquiry buttons", "Customers can order or ask a question on WhatsApp in one tap.", "#DDF3E8"],
    [IdCard, "Membership and plans", "Show your plans and let members get a digital card on WhatsApp.", "#FFE6D6"],
    [Star, "Gallery and reviews", "Photos of your place and genuine customer reviews build trust fast.", "#FFE0E3"],
    [MapPin, "Google Map built in", "Customers see where you are and how to reach you.", "#DDF3E8"],
    [Palette, "Templates you can switch", "Pick a look that fits your business and change it from the dashboard.", "#E0EAFF"],
    [Smartphone, "Mobile first", "It loads fast and looks right on the phone your customers are holding.", "#FFF0C2"],
    [BadgeCheck, "A marketplace profile too", "Every vendor website also gets a profile in the In2Fest marketplace.", "#FFE6D6"],
  ],
  who: {
    label: "Websites for every kind of local business",
    items: ["Gyms", "Restaurants and food stalls", "Shops and retail", "Pharmacies", "Coaching and academies", "Marriage halls and events"],
  },
};

const STEPS = {
  eyebrow: "How it works",
  title: "From your profile to a live website.",
  steps: [
    [UserPlus, "Add your details", "Fill in your name, services, photos and contact details."],
    [Palette, "Pick a template", "Choose the look that suits your business."],
    [Wrench, "We can build it for you", "Our team can set up the website and move your data if you want help."],
    [Rocket, "Go live", "Share your link on WhatsApp, Instagram and your shop board."],
  ],
};

const FAQ = [
  ["How fast can my website go live?", "A branded website can be live within a day."],
  ["Do I get my own address?", "Yes. Every website gets its own address on in2fest.com, for example yourname.in2fest.com."],
  ["Can I change how my website looks?", "Yes. You can switch between templates from your dashboard whenever you like."],
  ["I am not technical. Can someone build it for me?", "Yes. Our team can build your website and move your data across, so you do not have to do it yourself."],
  ["Will customers also find me in the marketplace?", "Yes. Every vendor website also gets a profile in the In2Fest marketplace."],
];

const CTA = {
  title: "Ready for your own website?",
  accent: "Get it now.",
  sub: "Look professional online without hiring a developer.",
  primary: { href: `${APP_URL}/login`, label: "Get my website" },
  secondary: { to: "/for-vendors/found-it", label: "Next: get found" },
};

export default function GetItPage() {
  return (
    <PillarPage
      pillarKey="get"
      seo={SEO}
      hero={HERO}
      marquee={["Your own website", "Catalogue", "WhatsApp buttons", "Gallery", "Reviews", "Google Map", "Mobile first"]}
      features={FEATURES}
      steps={STEPS}
      faq={FAQ}
      cta={CTA}
    />
  );
}