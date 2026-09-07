import React, { useState, useEffect } from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { adminSidebarItems } from "../adminSidebarItems.js";
import { useFetch } from "../../../hooks/useFetch";
import Loader from "../../../components/common/Loader";
import Button from "../../../components/common/Button";
import { adminDiscoveryService } from "../../../services/adminDiscoveryService";
import { showSuccess, showError } from "../../../components/common/Toast";

export default function FeaturedVendors() {
  const { data: venues, loading } = useFetch("/venues");
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminDiscoveryService.getFeaturedVendors().then(({ data }) => setSelected(data.data.map((v) => v.id)));
  }, []);

  const toggle = (id) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 10) { showError("You can feature up to 10 vendors"); return prev; }
      return [...prev, id];
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await adminDiscoveryService.setFeaturedVendors(selected);
      showSuccess("Featured vendors updated");
    } catch {
      showError("Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Featured Vendors"><Loader fullScreen /></DashboardLayout>;

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Featured Vendors">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{selected.length} / 10 selected</p>
        <Button loading={saving} onClick={save}>Save</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr><th className="px-4 py-3">Venue</th><th className="px-4 py-3">City</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Featured</th></tr>
          </thead>
          <tbody>
            {(venues || []).map((v) => (
              <tr key={v.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{v.hall_name}</td>
                <td className="px-4 py-3">{v.city}</td>
                <td className="px-4 py-3 capitalize">{v.business_category?.replace(/-/g, " ") || " -"}</td>
                <td className="px-4 py-3">
                  <input type="checkbox" className="accent-primary-600" checked={selected.includes(v.id)} onChange={() => toggle(v.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}