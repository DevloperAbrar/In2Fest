import React from "react";

/**
 * PriceRange
 *
 * Props:
 *   min        : number | null  - starting price
 *   max        : number | null  - maximum price
 *   note       : string | null  - optional pricing note
 *   size       : "sm" | "md" | "lg"
 *   showRange  : bool  - if false, only shows min price (default true)
 */

function formatINR(amount) {
  if (!amount && amount !== 0) return null;
  const num = Number(amount);
  if (isNaN(num)) return null;

  // Compact formatting for large numbers
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(num % 100000 === 0 ? 0 : 1)}L`;
  }
  if (num >= 1000) {
    return `₹${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}K`;
  }
  return `₹${num.toLocaleString("en-IN")}`;
}

const SIZE_STYLES = {
  sm:  { price: "text-sm font-semibold text-gray-800", label: "text-xs text-gray-400", separator: "text-xs text-gray-400" },
  md:  { price: "text-base font-bold text-gray-900",   label: "text-xs text-gray-400", separator: "text-sm text-gray-400" },
  lg:  { price: "text-2xl font-bold text-primary-700", label: "text-xs text-gray-400", separator: "text-lg text-gray-400" },
};

export default function PriceRange({ min, max, note, size = "md", showRange = true, className = "" }) {
  const styles = SIZE_STYLES[size] || SIZE_STYLES.md;
  const minStr = formatINR(min);
  const maxStr = formatINR(max);

  // Nothing to show
  if (!minStr && !maxStr) {
    return <span className={`${styles.price} text-gray-400 ${className}`}>Price on request</span>;
  }

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <div className="flex items-baseline gap-1.5 flex-wrap">
        {minStr && (
          <span className={styles.price}>
            {minStr}
          </span>
        )}
        {showRange && minStr && maxStr && (
          <span className={styles.separator}> -</span>
        )}
        {showRange && maxStr && minStr !== maxStr && (
          <span className={`${styles.price} opacity-70`}>{maxStr}</span>
        )}
        {minStr && (
          <span className={styles.label}>onwards</span>
        )}
      </div>
      {note && (
        <p className="text-xs text-gray-400 leading-snug">{note}</p>
      )}
    </div>
  );
}