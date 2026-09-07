import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { adminSidebarItems } from "../adminSidebarItems.js";
import { useFetch } from "../../../hooks/useFetch";
import Badge from "../../../components/common/Badge";
import Input from "../../../components/common/Input";
import Loader from "../../../components/common/Loader";
import EmptyState from "../../../components/common/EmptyState";
import Button from "../../../components/common/Button";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { showSuccess, showError } from "../../../components/common/Toast";
import { venueService } from "../../../services/venueService";
import { formatDate } from "../../../lib/formatters";
import { Search } from "lucide-react";

export default function VenueList() {
  const navigate = useNavigate();
  const { data: venues, loading, refetch } = useFetch("/venues");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = (venues || []).filter((v) =>
    v.hall_name.toLowerCase().includes(search.toLowerCase()) ||
    v.city?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await venueService.remove(deleteTarget.id);
      showSuccess("Venue deleted");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to delete venue");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Venues">
      <div className="mb-4 max-w-sm relative">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        <Input
          placeholder="Search by name or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <Loader />
      ) : filtered.length === 0 ? (
        <EmptyState title="No venues found" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
                <th className="px-4 py-3">Hall Name</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Marketplace</th>
                <th className="px-4 py-3">Last Login</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/admin/venues/${v.id}`} className="font-medium text-primary-600">
                      {v.hall_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{v.city}</td>
                  <td className="px-4 py-3">{v.subscription?.plan?.name || "-"}</td>
                  <td className="px-4 py-3"><Badge status={v.subscription?.status || "trial"} /></td>
                  <td className="px-4 py-3">
                    <Badge status={v.marketplace_listed ? "listed" : "not_listed"}>
                      {v.marketplace_listed ? "Listed" : "Not Listed"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(v.last_login_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => navigate(`/admin/venues/${v.id}`)}>
                        View
                      </Button>
                      <Button variant="danger" onClick={() => setDeleteTarget(v)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this venue?"
        message={deleteTarget ? `This will permanently delete ${deleteTarget.hall_name} and all its data. This cannot be undone.` : ""}
        confirmText="Delete"
        loading={deleting}
      />
    </DashboardLayout>
  );
}