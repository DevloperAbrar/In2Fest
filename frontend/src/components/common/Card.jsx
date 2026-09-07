import React from "react";

export default function Card({ children, className = "", title, action }) {
  return (
    <div className={`bg-white rounded-2xl shadow-card border border-navy-100/60 p-4 md:p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="font-display font-semibold text-navy-800 text-[15px]">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}