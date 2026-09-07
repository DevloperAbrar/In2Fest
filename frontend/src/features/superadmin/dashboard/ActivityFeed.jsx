import React from "react";
import Card from "../../../components/common/Card";
import EmptyState from "../../../components/common/EmptyState";
import { formatDateTime } from "../../../lib/formatters";

export default function ActivityFeed({ activities = [] }) {
  return (
    <Card title="Recent Activity">
      {activities.length === 0 ? (
        <EmptyState title="No recent activity" />
      ) : (
        <ul className="space-y-3">
          {activities.map((item, idx) => (
            <li key={idx} className="text-sm flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-700">{item.message}</span>
              <span className="text-gray-400 text-xs">{formatDateTime(item.timestamp)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}