import React from "react";
import {
  Receipt, Boxes, Users, QrCode, CalendarClock, BarChart3, IdCard, FileSpreadsheet,
  UserPlus, Smartphone, MessageCircle, BadgeCheck, TrendingUp,
} from "lucide-react";
import PillarPage, { RunVisual, APP_URL } from "../components/vendor/VendorKit";

const SEO = {
  title: "Business Management App for Gyms, Coaching and Libraries | Run it with In2Fest",
  description:
    "Run your daily operations from one affordable app: GST billing shared on WhatsApp, members and renewals, stock, attendance, staff salary and collections. Works on your phone.",
};

const HERO = {
  title: "Run your business",
  mark: "from one app.",
  sub: "Billing, members, renewals, stock and attendance in one place, so nothing lives in a diary or a loose Excel sheet again. Built to work on a phone.",
  primary: { href: `${APP_URL}/login`, label: "Start managing free" },
  secondary: { to: "/for-vendors", label: "See all three parts" },
  bullets: ["Works on phone, tablet or desktop", "GST bills on WhatsApp", "Import from Excel"],
  chips: [
    { icon: MessageCircle, bg: "#25D366", color: "#fff", title: "Bill shared", sub: "Sample · on WhatsApp" },
    { icon: TrendingUp, bg: "#f5a623", title: "Collections", sub: "Sample · last 6 months" },
  ],
  visual: <RunVisual />,
};

const FEATURES = {
  eyebrow: "What you can run",
  title: "Every rupee, member and product in one place.",
  sub: "Replace the diary, the bill book and the Excel sheet with one simple dashboard.",
  items: [
    [Receipt, "Billing with GST invoices", "Make a bill as a PDF, share it on WhatsApp and record the payment in one tap.", "#FFE0E3"],
    [Users, "Members, plans and dues", "See who is active, whose renewal is close and who still owes a fee.", "#E0EAFF"],
    [Boxes, "Stock and inventory", "Get low-stock and best-seller alerts so you know what sells fast and what sits.", "#FFF0C2"],
    [QrCode, "Attendance and busy hours", "Check members in with a QR scan and see your busy hours and peak days.", "#DDF3E8"],
    [CalendarClock, "Shifts and staff salary", "Plan shifts for your team and keep salary records without a notebook.", "#FFE6D6"],
    [BarChart3, "Collections and analytics", "Track what was collected, billed and pending across the months.", "#E0EAFF"],
    [IdCard, "Digital membership cards", "Send each member a card on WhatsApp with your name and logo.", "#FFF0C2"],
    [FileSpreadsheet, "Import from Excel", "Bring your existing customer list in instead of typing it all again.", "#DDF3E8"],
    [Smartphone, "Made for the phone", "No laptop needed. The same account works on phone, tablet and desktop.", "#FFE0E3"],
  ],
  who: {
    label: "Built first for businesses with monthly customers",
    items: ["Gyms and yoga studios", "Dance and sports academies", "Coaching classes", "Tiffin and mess", "Study libraries"],
  },
};

const STEPS = {
  eyebrow: "How it works",
  title: "From sign-up to running your day on it.",
  steps: [
    [UserPlus, "Create your account", "Sign up and choose your business type."],
    [FileSpreadsheet, "Bring your data", "Import your list from Excel, or our team can help move it."],
    [Receipt, "Bill and collect", "Make bills, take payments and send receipts on WhatsApp."],
    [BarChart3, "Watch it grow", "See collections, renewals and busy hours on your dashboard."],
  ],
};

const FAQ = [
  ["Which businesses is the management tool for?", "It is built first for businesses whose customers come back every month, such as gyms, yoga and dance studios, sports academies, coaching classes, tiffin and mess services and study libraries. Restaurants, shops and event venues use the website and marketplace listing."],
  ["Do I need a laptop or computer?", "No. Everything works on a phone. The same account also works on a tablet or a desktop if you have one."],
  ["Can I bring my existing customer list?", "Yes. You can import your members or customers from an Excel file instead of typing them in again."],
  ["Can I send bills on WhatsApp?", "Yes. Bills are made as PDF invoices and you can share them with the customer on WhatsApp."],
  ["Is my website and listing included?", "Yes. Run it is one part of one account. The same account also gives you your own website and a marketplace listing."],
];

const CTA = {
  title: "Ready to run it?",
  accent: "Start today.",
  sub: "Put your billing, members and stock in one place and stop chasing paper.",
  primary: { href: `${APP_URL}/login`, label: "Get started free" },
  secondary: { to: "/for-vendors/get-it", label: "Next: your website" },
};

export default function RunItPage() {
  return (
    <PillarPage
      pillarKey="run"
      seo={SEO}
      hero={HERO}
      marquee={["Billing", "Members", "Renewals", "Stock", "Attendance", "Staff salary", "Collections"]}
      features={FEATURES}
      steps={STEPS}
      faq={FAQ}
      cta={CTA}
    />
  );
}