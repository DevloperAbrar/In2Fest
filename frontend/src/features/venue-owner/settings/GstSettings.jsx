import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";

export default function GstSettings() {
  const { t } = useTranslation();
  const { venue, refetchVenue } = useVenue();
  const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  const { register, handleSubmit, watch, reset, setValue, formState: { isSubmitting, errors } } = useForm({
    defaultValues: { gst_enabled: venue?.gst_enabled || false, gst_number: venue?.gst_number || "" }
  });
  const gstEnabled = watch("gst_enabled");

  useEffect(() => {
    if (venue) {
      reset({ gst_enabled: venue?.gst_enabled || false, gst_number: venue?.gst_number || "" });
    }
  }, [venue, reset]);

  const onSubmit = async (values) => {
    try {
      await venueService.update(venue.id, values);
      showSuccess(t("settings.gst.updateSuccess"));
      refetchVenue();
    } catch {
      showError(t("settings.gst.updateError"));
    }
  };

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle={t("settings.gst.pageTitle")}>
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg bg-white p-6 rounded-xl border border-gray-100 space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("gst_enabled")} /> {t("settings.gst.enableLabel")}
        </label>
        {gstEnabled && (
          <Input
            label={t("settings.gst.gstNumber")}
            placeholder="22AAAAA0000A1Z5"
            maxLength={15}
            error={errors.gst_number?.message}
            {...register("gst_number", {
              required: gstEnabled ? t("settings.gst.required") : false,
              pattern: { value: GSTIN_REGEX, message: t("settings.gst.invalidFormat") },
              onChange: (e) => {
                const cleaned = e.target.value.toUpperCase().slice(0, 15);
                setValue("gst_number", cleaned, { shouldValidate: true });
              },
            })}
          />
        )}
        <Button type="submit" loading={isSubmitting}>{t("settings.gst.save")}</Button>
      </form>
    </DashboardLayout>
  );
}