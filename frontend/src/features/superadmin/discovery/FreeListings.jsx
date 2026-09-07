import React, { useState } from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { adminSidebarItems } from "../adminSidebarItems.js";
import { useFetch } from "../../../hooks/useFetch";
import Loader from "../../../components/common/Loader";
import Badge from "../../../components/common/Badge";
import Button from "../../../components/common/Button";
import { adminDiscoveryService } from "../../../services/adminDiscoveryService";
import { showSuccess, showError } from "../../../components/common/Toast";

export default function FreeListings() {
  const [statusFilter, setStatusFilter] = useState("");
  const { data: listings, loading, refetch } = useFetch(`/listing/admin/all${statusFilter ? `?status=${statusFilter}` : ""}`);

  const approve = async (id) => {
    try { await adminDiscoveryService.approveListing(id); showSuccess("Listing approved"); refetch(); }
    catch { showError("Could not approve"); }
  };
  const reject = async (id) => {
    try { await adminDiscoveryService.rejectListing(id); showSuccess("Listing rejected"); refetch(); }
    catch { showError("Could not reject"); }
  };
  const sendUpgrade = async (id) => {
    try { await adminDiscoveryService.sendUpgradeLink(id); showSuccess("Upgrade link sent"); }
    catch { showError("Could not send upgrade link  - check Razorpay config"); }
  };

  if (loading) return <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Free Listings"><Loader fullScreen /></DashboardLayout>;

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Free Listings">
      <select className="mb-4 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="active">Active</option>
        <option value="rejected">Rejected</option>
      </select>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Business</th><th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Views</th><th className="px-4 py-3">Inquiries</th>
              <th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(listings || []).map((l) => (
              <tr key={l.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{l.business_name}</td>
                <td className="px-4 py-3">{l.cityRef?.name || " -"}</td>
                <td className="px-4 py-3">{l.profile_views}</td>
                <td className="px-4 py-3">{l.inquiry_count}</td>
                <td className="px-4 py-3"><Badge status={l.status} /></td>
                <td className="px-4 py-3 flex gap-2">
                  {l.status === "pending" && <>
                    <button onClick={() => approve(l.id)} className="text-green-600 text-xs font-medium">Approve</button>
                    <button onClick={() => reject(l.id)} className="text-red-600 text-xs font-medium">Reject</button>
                  </>}
                  {l.status === "active" && (
                    <button onClick={() => sendUpgrade(l.id)} className="text-primary-600 text-xs font-medium">Send Upgrade Link</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}