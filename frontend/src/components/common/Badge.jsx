import React from "react";
import { statusColor } from "../../lib/formatters";

export default function Badge({ status, children }) {
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColor(status)}`}>
      {children || status?.replace(/_/g, " ")}
    </span>
  );
}