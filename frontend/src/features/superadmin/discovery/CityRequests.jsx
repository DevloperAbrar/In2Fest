import React, { useState } from "react";
import { MessageCircle, Mail, CheckCheck, XCircle, Trash2, MapPin } from "lucide-react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { adminSidebarItems } from "../adminSidebarItems.js";
import { useFetch } from "../../../hooks/useFetch";
import Loader from "../../../components/common/Loader";
import { adminDiscoveryService } from "../../../services/adminDiscoveryService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { formatDateTime } from "../../../lib/formatters";

const PILL = {
  pending: "bg-yellow-100 text-yellow-700",
  notified: "bg-green-100 text-green-700",
  dismissed: "bg-gray-100 text-gray-600"
};

function contactHref(r) {
  if (r.contact_type === "email") return `mailto:${r.contact}`;
  let digits = String(r.contact).replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  return `https://wa.me/${digits}`;
}

export default function CityRequests() {
  const [status, setStatus] = useState("pending");
  const url = `/admin/discovery/city-requests${status ? `?status=${status}` : ""}`;
  const { data, loading, refetch } = useFetch(url);

  const requests = data?.requests || [];
  const cities = data?.cities || [];
  const counts = data?.counts || { pending: 0, notified: 0, dismissed: 0 };
  const total = counts.pending + counts.notified + counts.dismissed;

  const tabs = [
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "notified", label: "Notified", count: counts.notified },
    { key: "dismissed", label: "Dismissed", count: counts.dismissed },
    { key: "", label: "All", count: total }
  ];

  const changeStatus = async (id, next) => {
    try {
      await adminDiscoveryService.updateCityRequest(id, next);
      showSuccess(next === "notified" ? "Marked as notified" : "Request dismissed");
      refetch();
    } catch {
      showError("Could not update request");
    }
  };

  const markCityNotified = async (city) => {
    try {
      const res = await adminDiscoveryService.bulkUpdateCityRequests(city.city_key, "notified");
      const updated = res.data?.data?.updated ?? city.count;
      showSuccess(`${updated} request(s) for ${city.city} marked as notified`);
      refetch();
    } catch {
      showError("Could not update requests");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this request permanently?")) return;
    try {
      await adminDiscoveryService.deleteCityRequest(id);
      showSuccess("Request deleted");
      refetch();
    } catch {
      showError("Could not delete request");
    }
  };

  if (loading && !data) {
    return (
      <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="City Requests">
        <Loader fullScreen />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="City Requests">
      {/* Demand by city */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Demand by city <span className="text-gray-400 font-normal">(pending requests)</span>
        </h3>
        {cities.length === 0 ? (
          <p className="text-sm text-gray-400">No pending city requests.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cities.map((c) => (
              <div
                key={c.city_key}
                className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-3 py-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin size={16} className="text-primary-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.city}</p>
                    <p className="text-xs text-gray-500">
                      {c.count} {c.count === 1 ? "person" : "people"} waiting
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => markCityNotified(c)}
                  className="text-xs font-medium text-green-600 hover:underline whitespace-nowrap"
                  title="Use this after you launch in this city and have informed everyone"
                >
                  Mark all notified
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key || "all"}
            onClick={() => setStatus(t.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              status === t.key
                ? "bg-primary-600 text-white border-primary-600"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Requests table */}
      <div className={`bg-white rounded-xl border border-gray-100 overflow-x-auto ${loading ? "opacity-60" : ""}`}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Requested</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No requests here yet.
                </td>
              </tr>
            )}
            {requests.map((r) => (
              <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{r.city}</td>
                <td className="px-4 py-3">
                  
                  <a  href={contactHref(r)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary-600 hover:underline"
                  >
                    {r.contact_type === "email" ? <Mail size={14} /> : <MessageCircle size={14} />}
                    {r.contact}
                  </a>
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize ${PILL[r.status] || PILL.dismissed}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {r.status !== "notified" && (
                      <button
                        onClick={() => changeStatus(r.id, "notified")}
                        className="inline-flex items-center gap-1 text-green-600 text-xs font-medium"
                      >
                        <CheckCheck size={14} /> Notified
                      </button>
                    )}
                    {r.status === "pending" && (
                      <button
                        onClick={() => changeStatus(r.id, "dismissed")}
                        className="inline-flex items-center gap-1 text-gray-500 text-xs font-medium"
                      >
                        <XCircle size={14} /> Dismiss
                      </button>
                    )}
                    {r.status !== "pending" && (
                      <button
                        onClick={() => changeStatus(r.id, "pending")}
                        className="text-yellow-600 text-xs font-medium"
                      >
                        Reopen
                      </button>
                    )}
                    <button
                      onClick={() => remove(r.id)}
                      className="inline-flex items-center gap-1 text-red-600 text-xs font-medium"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}