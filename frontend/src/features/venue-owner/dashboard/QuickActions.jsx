import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVisibleNavItems } from "../../../hooks/useVisibleNavItems";
import { Surface } from "./dashboardUi.jsx";
import { TONES, fadeUp, stagger } from "./dashboardTheme.js";

// Order = priority. Anything the vendor's plan / business type / team permissions
// don't allow is dropped automatically by useVisibleNavItems (same rules as the sidebar).
const SHORTCUTS = [
  { navKey: "inquiries", tone: "sky" },
  { navKey: "bookings", tone: "emerald" },
  { navKey: "clients", tone: "violet" },
  { navKey: "gym", tone: "red" },
  { navKey: "food", tone: "amber" },
  { navKey: "orders", tone: "amber" },
  { navKey: "catalog", tone: "violet" },
  { navKey: "inventory", tone: "navy" },
  { navKey: "billing", tone: "emerald", label: "New Invoice" },
  { navKey: "reviews", tone: "amber" },
  { navKey: "slots", tone: "sky" }
];

const MAX_TILES = 8;

// Soft gradients used on mobile only (desktop keeps the flat chip colours).
const MOBILE_GRADIENTS = {
  sky: "from-sky-50 to-sky-100",
  emerald: "from-emerald-50 to-emerald-100",
  violet: "from-violet-50 to-violet-100",
  red: "from-primary-50 to-primary-100",
  amber: "from-amber-50 to-amber-100",
  navy: "from-navy-50 to-navy-100"
};

export default function QuickActions() {
  const visible = useVisibleNavItems(ownerSidebarItems);

  const tiles = SHORTCUTS.map((s) => {
    const item = visible.find((v) => v.navKey === s.navKey);
    return item ? { ...s, item } : null;
  })
    .filter(Boolean)
    .slice(0, MAX_TILES);

  if (tiles.length === 0) return null;

  return (
    <motion.section variants={fadeUp} aria-label="Shortcuts">
      <Surface className="p-4 md:p-4">
        <h2 className="md:hidden px-0.5 pb-3 font-display font-semibold text-[15px] text-navy-900">Quick actions</h2>
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-4 gap-x-2 gap-y-4 md:grid-cols-8"
        >
          {tiles.map(({ item, tone, label }) => {
            const Icon = item.icon;
            return (
              <motion.div key={item.path} variants={fadeUp}>
                <Link
                  to={item.path}
                  className="tap-scale group flex flex-col items-center gap-2 md:gap-1.5 rounded-xl py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                >
                  <span
                    className={`w-14 h-14 rounded-[20px] md:w-[52px] md:h-[52px] md:rounded-2xl flex items-center justify-center transition-transform group-hover:-translate-y-0.5 bg-gradient-to-br ${MOBILE_GRADIENTS[tone]} md:bg-none ring-1 ring-inset ring-black/5 md:ring-0 shadow-sm md:shadow-none ${TONES[tone].chip}`}
                  >
                    <Icon size={22} strokeWidth={2} />
                  </span>
                  <span className="text-[11.5px] font-medium text-navy-700 text-center leading-tight line-clamp-2">
                    {label || item.label}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </Surface>
    </motion.section>
  );
}