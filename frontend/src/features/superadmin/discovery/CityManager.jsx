import React, { useState } from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { adminSidebarItems } from "../adminSidebarItems.js";
import { useFetch } from "../../../hooks/useFetch";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import Loader from "../../../components/common/Loader";
import { adminDiscoveryService } from "../../../services/adminDiscoveryService";
import { showSuccess, showError } from "../../../components/common/Toast";

export default function CityManager() {
  const { data: cities, loading, refetch } = useFetch("/admin/discovery/cities");
  const [form, setForm] = useState({ name: "", state: "", latitude: "", longitude: "" });
  const [saving, setSaving] = useState(false);

  const addCity = async () => {
    if (!form.name || !form.state) { showError("Name and state are required"); return; }
    setSaving(true);
    try {
      await adminDiscoveryService.createCity(form);
      showSuccess("City added");
      setForm({ name: "", state: "", latitude: "", longitude: "" });
      refetch();
    } catch {
      showError("Could not add city");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (city) => {
    try {
      await adminDiscoveryService.updateCity(city.id, { active: !city.active });
      refetch();
    } catch {
      showError("Could not update city");
    }
  };

  if (loading) return <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="City Manager"><Loader fullScreen /></DashboardLayout>;

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="City Manager">
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <Input label="City name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        <Input label="Latitude" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
        <Input label="Longitude" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
        <Button loading={saving} onClick={addCity}>Add City</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr><th className="px-4 py-3">City</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Active</th></tr>
          </thead>
          <tbody>
            {(cities || []).map((c) => (
              <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{c.state}</td>
                <td className="px-4 py-3">
                  <input type="checkbox" className="accent-primary-600" checked={c.active} onChange={() => toggleActive(c)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}