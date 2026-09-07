import React from "react";
import { useFetch } from "../../../hooks/useFetch";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import Loader from "../../../components/common/Loader";
import { formatDateTime } from "../../../lib/formatters";

export default function MessageHistoryLog() {
  const { data: messages, loading } = useFetch("/whatsapp/history");

  if (loading) return <Loader />;

  return (
    <Card title="Message History">
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {(messages || []).map((m) => (
          <div key={m.id} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
            <div>
              <p>{m.recipient_phone}</p>
              <p className="text-xs text-gray-400">{m.body?.slice(0, 60)}...</p>
            </div>
            <div className="text-right">
              <Badge status={m.status} />
              <p className="text-xs text-gray-400 mt-1">{formatDateTime(m.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}