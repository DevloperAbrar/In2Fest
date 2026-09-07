import React from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { adminSidebarItems } from "../adminSidebarItems.js";
import { useFetch } from "../../../hooks/useFetch";
import Card from "../../../components/common/Card";
import Loader from "../../../components/common/Loader";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function MarketplaceAnalytics() {
  const { data, loading } = useFetch("/admin/discovery/analytics");

  if (loading) return <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Marketplace Analytics"><Loader fullScreen /></DashboardLayout>;

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Marketplace Analytics">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card title="Marketplace vs Subdomain Inquiries">
          <div className="flex gap-8 items-center justify-center py-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-600">{data?.marketplace_inquiries}</p>
              <p className="text-xs text-gray-400">Marketplace</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-400">{data?.subdomain_inquiries}</p>
              <p className="text-xs text-gray-400">Subdomain</p>
            </div>
          </div>
        </Card>

        <Card title="Most Viewed Vendors">
          <div className="space-y-2">
            {(data?.most_viewed_vendors || []).slice(0, 5).map((v) => (
              <div key={v.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{v.hall_name}</span>
                <span className="text-gray-400">{v.review_count} reviews</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Top Cities" className="mb-6">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data?.top_cities || []}>
            <XAxis dataKey="city" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Top Categories">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data?.top_categories || []}>
            <XAxis dataKey="category" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#6d28d9" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </DashboardLayout>
  );
}