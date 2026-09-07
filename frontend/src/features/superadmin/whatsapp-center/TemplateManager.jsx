import React from "react";
import { useFetch } from "../../../hooks/useFetch";
import Card from "../../../components/common/Card";
import Loader from "../../../components/common/Loader";

export default function TemplateManager() {
  const { data: templates, loading } = useFetch("/whatsapp/templates");

  if (loading) return <Loader />;

  return (
    <Card title="Message Templates">
      <div className="space-y-3">
        {templates.map((t) => (
          <div key={t.id} className="border border-gray-100 rounded-lg p-3">
            <p className="font-medium text-sm">{t.name}</p>
            <p className="text-xs text-gray-500 mt-1">{t.body_template}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}