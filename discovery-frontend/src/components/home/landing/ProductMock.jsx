import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Search, MapPin, MessageCircle, Star } from "lucide-react";

// Order matters: this is the order of the hero switcher.
export const VERTICALS = [
  {
    id: "gym",
    label: "Gyms",
    app: "Gym dashboard",
    nav: ["Overview", "Members", "Plans", "Attendance", "Store"],
    kpis: [["Active members", "126"], ["Expiring soon", "14"], ["Today's check-ins", "38"]],
    listTitle: "Renewals due",
    rows: [
      ["Rohit S.", "Quarterly plan", "3 days", "warn"],
      ["Neha K.", "Monthly plan", "Paid", "ok"],
      ["Aman V.", "Annual plan", "Today", "due"],
      ["Pooja T.", "Monthly plan", "Paid", "ok"],
    ],
  },
  {
    id: "library",
    label: "Library",
    app: "Study room dashboard",
    nav: ["Overview", "Students", "Seats", "Attendance", "Books"],
    kpis: [["Seats filled", "72/90"], ["Fees pending", "9"], ["Present today", "61"]],
    listTitle: "Seat allocation",
    rows: [
      ["Hall A · Seat 12", "Morning shift", "Filled", "ok"],
      ["Hall A · Seat 13", "Morning shift", "Free", "warn"],
      ["Hall B · Seat 04", "Evening shift", "Filled", "ok"],
      ["Hall B · Seat 05", "Full day", "Fee due", "due"],
    ],
  },
  {
    id: "food",
    label: "Food",
    app: "Restaurant dashboard",
    nav: ["Overview", "Orders", "Menu", "Reports", "Settings"],
    kpis: [["Orders today", "47"], ["Preparing", "6"], ["Avg. bill", "₹420"]],
    listTitle: "Live order board",
    rows: [
      ["Order #1042", "2 items · Table 5", "New", "due"],
      ["Order #1041", "4 items · Pickup", "Preparing", "warn"],
      ["Order #1040", "1 item · Delivery", "Ready", "ok"],
      ["Order #1039", "3 items · Table 2", "Served", "ok"],
    ],
  },
  {
    id: "shops",
    label: "Shops",
    app: "Shop dashboard",
    nav: ["Overview", "Items", "Stock", "Billing", "Customers"],
    kpis: [["Bills today", "29"], ["Low stock", "7"], ["Items listed", "380"]],
    listTitle: "Stock alerts",
    rows: [
      ["Cotton kurta · M", "Clothing", "4 left", "due"],
      ["Running shoes · 8", "Footwear", "9 left", "warn"],
      ["Denim jacket · L", "Clothing", "22 left", "ok"],
      ["Sports socks", "Accessories", "40 left", "ok"],
    ],
  },
  {
    id: "events",
    label: "Events",
    app: "Bookings dashboard",
    nav: ["Overview", "Bookings", "Calendar", "Clients", "Invoices"],
    kpis: [["Bookings this month", "18"], ["Open enquiries", "11"], ["Balance due", "6"]],
    listTitle: "Upcoming bookings",
    rows: [
      ["Sharma family", "Sat · Evening slot", "Confirmed", "ok"],
      ["Corporate meet", "Sun · Full day", "Advance paid", "warn"],
      ["Birthday party", "Next Fri", "Enquiry", "due"],
      ["Anniversary", "Next Sat", "Confirmed", "ok"],
    ],
  },
];

const TONE = {
  ok: "bg-emerald-50 text-emerald-700",
  warn: "bg-amber-50 text-amber-700",
  due: "bg-accent-50 text-accent-600",
};

function Frame({ url, children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-navy-100 bg-white overflow-hidden shadow-[0_30px_80px_-30px_rgba(26,32,53,0.35)] ${className}`}
    >
      <div className="flex items-center gap-3 px-4 py-2.5 bg-navy-50 border-b border-navy-100">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="w-2.5 h-2.5 rounded-full bg-navy-200" />
          <span className="w-2.5 h-2.5 rounded-full bg-navy-200" />
          <span className="w-2.5 h-2.5 rounded-full bg-navy-200" />
        </div>
        <div className="flex-1 truncate text-[11px] text-navy-400 bg-white rounded-md px-3 py-1 border border-navy-100">
          {url}
        </div>
      </div>
      {children}
    </div>
  );
}

function DashboardBody({ v }) {
  return (
    <div className="flex min-h-[300px]">
      <div className="hidden sm:flex flex-col gap-1 w-32 p-3 bg-navy-700">
        <p className="text-[10px] font-bold tracking-widest uppercase text-gold-500 mb-2 px-2">In2Fest</p>
        {v.nav.map((n, i) => (
          <span
            key={n}
            className={`text-[11px] px-2 py-1.5 rounded-md ${i === 0 ? "bg-white/15 text-white font-semibold" : "text-white/60"}`}
          >
            {n}
          </span>
        ))}
      </div>
      <div className="flex-1 p-4 bg-navy-50/40 min-w-0">
        <div className="grid grid-cols-3 gap-2.5">
          {v.kpis.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-white border border-navy-100 p-3">
              <p className="text-[10px] text-navy-400 leading-tight">{label}</p>
              <p className="font-display font-extrabold text-lg text-navy-700 mt-1">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl bg-white border border-navy-100 overflow-hidden">
          <p className="px-3 py-2 text-[11px] font-bold text-navy-700 border-b border-navy-100">{v.listTitle}</p>
          {v.rows.map(([name, meta, tag, tone]) => (
            <div key={name} className="flex items-center justify-between gap-2 px-3 py-2 border-b last:border-0 border-navy-50">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-navy-700 truncate">{name}</p>
                <p className="text-[10px] text-navy-400 truncate">{meta}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${TONE[tone]}`}>{tag}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardMock({ vertical = "gym", className = "" }) {
  const reduce = useReducedMotion();
  const v = VERTICALS.find((x) => x.id === vertical) || VERTICALS[0];
  return (
    <Frame url={`app.in2fest.com · ${v.app}`} className={className}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={v.id}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 1 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
        >
          <DashboardBody v={v} />
        </motion.div>
      </AnimatePresence>
      <p className="px-4 py-2 text-[10px] text-navy-300 border-t border-navy-100 bg-white">Sample view for illustration</p>
    </Frame>
  );
}

export function WebsiteMock({ className = "" }) {
  return (
    <Frame url="yourbusiness.in2fest.com" className={className}>
      <div className="min-h-[300px] bg-white">
        <div className="flex items-center justify-between px-5 py-3 border-b border-navy-50">
          <span className="font-display font-extrabold text-sm text-navy-700">Your Business</span>
          <div className="hidden sm:flex gap-4 text-[11px] text-navy-400">
            <span>About</span><span>Services</span><span>Gallery</span><span>Contact</span>
          </div>
        </div>
        <div className="px-5 py-7 bg-gradient-to-br from-navy-700 to-navy-800">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gold-500">Open today · 6 AM – 10 PM</p>
          <p className="font-display font-extrabold text-xl text-white mt-2 leading-tight">Your business name,<br />online and open for enquiries</p>
          <div className="flex gap-2 mt-4">
            <span className="text-[11px] font-bold text-white bg-accent-500 rounded-lg px-3 py-1.5">Enquire now</span>
            <span className="text-[11px] font-semibold text-white border border-white/30 rounded-lg px-3 py-1.5">Call us</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2.5 p-4">
          {["Services", "Plans", "Reviews"].map((t) => (
            <div key={t} className="rounded-xl border border-navy-100 p-3">
              <div className="h-8 rounded-md bg-navy-50 mb-2" />
              <p className="text-[11px] font-semibold text-navy-700">{t}</p>
              <div className="h-1.5 w-3/4 rounded bg-navy-100 mt-1.5" />
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export function MarketplaceMock({ className = "" }) {
  const cards = [
    ["Sample Fitness Club", "Gym · Indore", "4.8"],
    ["Sample Study Room", "Library · Indore", "4.6"],
    ["Sample Kitchen", "Restaurant · Indore", "4.7"],
  ];
  return (
    <Frame url="in2fest.com/search" className={className}>
      <div className="min-h-[300px] bg-navy-50/40 p-4">
        <div className="flex items-center gap-2 rounded-xl bg-white border border-navy-100 px-3 py-2">
          <Search size={14} className="text-navy-300" />
          <span className="text-[12px] text-navy-400 flex-1">Search near you</span>
          <span className="hidden sm:flex items-center gap-1 text-[11px] text-navy-400"><MapPin size={12} /> Indore</span>
        </div>
        <div className="mt-3 space-y-2.5">
          {cards.map(([name, meta, rating]) => (
            <div key={name} className="flex gap-3 rounded-xl bg-white border border-navy-100 p-2.5">
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-navy-100 to-navy-200 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-navy-700 truncate">{name}</p>
                <p className="text-[10px] text-navy-400">{meta}</p>
                <p className="flex items-center gap-1 text-[10px] text-navy-500 mt-1">
                  <Star size={10} className="text-gold-500 fill-current" /> {rating}
                </p>
              </div>
              <span className="self-center flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-600 rounded-lg px-2.5 py-1.5">
                <MessageCircle size={11} /> WhatsApp
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-navy-300">Sample listings for illustration</p>
      </div>
    </Frame>
  );
}