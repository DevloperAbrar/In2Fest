import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import Badge from "../../../components/common/Badge";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import api from "../../../services/api";
import { showSuccess, showError } from "../../../components/common/Toast";
import { useFetch } from "../../../hooks/useFetch";
import EmptyState from "../../../components/common/EmptyState";
import { PLAN_FEATURES } from "../../../lib/planFeatures";
import { Pencil, Trash2, X, Check } from "lucide-react";

const emptyPermissions = PLAN_FEATURES.reduce((acc, f) => {
  acc[f.key] = false;
  return acc;
}, {});

function PermissionGrid({ permissions, onChange, disabled }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
      {PLAN_FEATURES.map((f) => (
        <label key={f.key} className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="rounded border-gray-300"
            checked={!!permissions[f.key]}
            disabled={disabled}
            onChange={(e) => onChange(f.key, e.target.checked)}
          />
          {t(`common.features.${f.key}`, f.label)}
        </label>
      ))}
    </div>
  );
}

export default function TeamMembers() {
  const { t } = useTranslation();
  const { venue } = useVenue();
  const { data: members, loading, refetch } = useFetch(venue ? `/venues/${venue.id}/team-members` : null, { skip: !venue });

  const [newPermissions, setNewPermissions] = useState(emptyPermissions);
  const [editingId, setEditingId] = useState(null);
  const [editPermissions, setEditPermissions] = useState(emptyPermissions);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const onSubmit = async (values) => {
    try {
      await api.post(`/venues/${venue.id}/team-members`, { ...values, permissions: newPermissions });
      showSuccess(t("settings.team.addSuccess"));
      reset();
      setNewPermissions(emptyPermissions);
      refetch();
    } catch (err) {
      showError(err.response?.data?.message || t("settings.team.addError"));
    }
  };

  const startEdit = (member) => {
    setEditingId(member.id);
    setEditName(member.name);
    setEditPermissions({ ...emptyPermissions, ...member.permissions });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditPermissions(emptyPermissions);
  };

  const saveEdit = async (memberId) => {
    setSavingEdit(true);
    try {
      await api.patch(`/venues/${venue.id}/team-members/${memberId}`, {
        name: editName,
        permissions: editPermissions
      });
      showSuccess(t("settings.team.editSuccess"));
      setEditingId(null);
      refetch();
    } catch (err) {
      showError(err.response?.data?.message || t("settings.team.editError"));
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleActive = async (member) => {
    try {
      await api.patch(`/venues/${venue.id}/team-members/${member.id}`, { is_active: !member.is_active });
      showSuccess(member.is_active ? t("settings.team.deactivateSuccess") : t("settings.team.activateSuccess"));
      refetch();
    } catch (err) {
      showError(err.response?.data?.message || t("settings.team.toggleError"));
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/venues/${venue.id}/team-members/${deletingId}`);
      showSuccess(t("settings.team.removeSuccess"));
      setDeletingId(null);
      refetch();
    } catch (err) {
      showError(err.response?.data?.message || t("settings.team.removeError"));
    }
  };

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle={t("settings.team.pageTitle")}>
      <div className="max-w-3xl space-y-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 space-y-4">
          <h3 className="text-sm font-semibold text-gray-800">{t("settings.team.addTitle")}</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label={t("settings.team.name")} {...register("name", { required: true })} />
              <Input label={t("settings.team.email")} type="email" {...register("email", { required: true })} />
              <Input label={t("settings.team.password")} type="password" {...register("password", { required: true, minLength: 6 })} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">{t("settings.team.accessLabel")}</p>
              <PermissionGrid permissions={newPermissions} onChange={(key, val) => setNewPermissions((p) => ({ ...p, [key]: val }))} />
            </div>
            <Button type="submit" loading={isSubmitting}>{t("settings.team.addBtn")}</Button>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
          {!loading && (!members || members.length === 0) && (
            <div className="p-6">
              <EmptyState title={t("settings.team.emptyTitle")} description={t("settings.team.emptyDesc")} />
            </div>
          )}

          {members?.map((member) => (
            <div key={member.id} className="p-6">
              {editingId === member.id ? (
                <div className="space-y-4">
                  <Input label={t("settings.team.name")} value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">{t("settings.team.editAccessLabel")}</p>
                    <PermissionGrid permissions={editPermissions} onChange={(key, val) => setEditPermissions((p) => ({ ...p, [key]: val }))} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => saveEdit(member.id)} loading={savingEdit}>
                      <Check size={14} className="mr-1" /> {t("settings.team.save")}
                    </Button>
                    <Button variant="outline" onClick={cancelEdit}>
                      <X size={14} className="mr-1" /> {t("settings.team.cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-800">{member.name}</p>
                      <Badge status={member.is_active ? "active" : "suspended"}>
                        {member.is_active ? t("settings.team.active") : t("settings.team.inactive")}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">{member.email}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {PLAN_FEATURES.filter((f) => member.permissions?.[f.key]).map((f) => (
                        <span key={f.key} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                          {t(`common.features.${f.key}`, f.label)}
                        </span>
                      ))}
                      {PLAN_FEATURES.every((f) => !member.permissions?.[f.key]) && (
                        <span className="text-xs text-gray-400">{t("settings.team.noAccess")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => startEdit(member)} className="text-gray-400 hover:text-gray-700" title={t("settings.team.editTitle")}>
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => toggleActive(member)} className="text-xs text-gray-500 hover:text-gray-800 underline">
                      {member.is_active ? t("settings.team.deactivate") : t("settings.team.activate")}
                    </button>
                    <button onClick={() => setDeletingId(member.id)} className="text-gray-400 hover:text-red-600" title={t("settings.team.removeTitle")}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
        title={t("settings.team.removeConfirmTitle")}
        message={t("settings.team.removeConfirmMsg")}
        confirmText={t("settings.team.removeConfirmBtn")}
      />
    </DashboardLayout>
  );
}