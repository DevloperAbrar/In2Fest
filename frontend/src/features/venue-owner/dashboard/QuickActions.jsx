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
      <Surface className="p-3 md:p-4">
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
                  className="tap-scale group flex flex-col items-center gap-1.5 rounded-xl py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                >
                  <span
                    className={`w-12 h-12 md:w-[52px] md:h-[52px] rounded-2xl flex items-center justify-center transition-transform group-hover:-translate-y-0.5 ${TONES[tone].chip}`}
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