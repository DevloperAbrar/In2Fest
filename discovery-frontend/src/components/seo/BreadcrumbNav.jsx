import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function BreadcrumbNav({ items = [] }) {
  return (
    <div className="flex items-center gap-1 text-xs text-gray-400 max-w-6xl mx-auto px-4 pt-4">
      <Link to="/" className="hover:text-primary-600">Home</Link>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <ChevronRight size={12} />
          {item.to ? <Link to={item.to} className="hover:text-primary-600">{item.label}</Link> : <span>{item.label}</span>}
        </React.Fragment>
      ))}
    </div>
  );
}