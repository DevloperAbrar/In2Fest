import React, { useState } from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { adminSidebarItems } from "../adminSidebarItems.js";
import { useFetch } from "../../../hooks/useFetch";
import Input from "../../../components/common/Input";
import Loader from "../../../components/common/Loader";
import { adminDiscoveryService } from "../../../services/adminDiscoveryService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { Search } from "lucide-react";

export default function VerificationBadges() {
  const { data: venues, loading, refetch } = useFetch("/venues");
  const [search, setSearch] = useState("");

  const filtered = (venues || []).filter((v) => v.hall_name.toLowerCase().includes(search.toLowerCase()));

  const toggleBadge = async (venue, field) => {
    try {
      await adminDiscoveryService.setVenueBadges(venue.id, {
        badge_verified_business: venue.badge_verified_business,
        badge_documents_verified: venue.badge_documents_verified,
        badge_premium_partner: venue.badge_premium_partner,
        [field]: !venue[field]
      });
      showSuccess("Badge updated");
      refetch();
    } catch {
      showError("Could not update badge");
    }
  };

  if (loading) return <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Verification Badges"><Loader fullScreen /></DashboardLayout>;

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Verification Badges">
      <div className="mb-4 max-w-sm relative">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        <Input placeholder="Search venue..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Venue</th>
              <th className="px-4 py-3">Verified Business</th>
              <th className="px-4 py-3">Documents Verified</th>
              <th className="px-4 py-3">Premium Partner</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr key={v.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{v.hall_name}</td>
                <td className="px-4 py-3">
                  <input type="checkbox" className="accent-primary-600" checked={!!v.badge_verified_business} onChange={() => toggleBadge(v, "badge_verified_business")} />
                </td>
                <td className="px-4 py-3">
                  <input type="checkbox" className="accent-primary-600" checked={!!v.badge_documents_verified} onChange={() => toggleBadge(v, "badge_documents_verified")} />
                </td>
                <td className="px-4 py-3">
                  <input type="checkbox" className="accent-primary-600" checked={!!v.badge_premium_partner} onChange={() => toggleBadge(v, "badge_premium_partner")} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}