import React from "react";
import { Inbox } from "lucide-react";

export default function EmptyState({ icon: Icon = Inbox, title = "Nothing here yet", description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="w-12 h-12 text-gray-300 mb-4" />
      <h3 className="text-gray-700 font-medium mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-400 mb-4 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}