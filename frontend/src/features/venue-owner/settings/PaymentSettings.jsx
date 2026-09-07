import React from "react";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";

export default function PaymentSettings() {
  const { t } = useTranslation();
  const { venue, refetchVenue } = useVenue();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: {
      upi_id: venue?.upi_id || "",
      bank_details: {
        account_number: venue?.bank_details?.account_number || "",
        beneficiary_name: venue?.bank_details?.beneficiary_name || "",
        bank_name: venue?.bank_details?.bank_name || "",
        ifsc_code: venue?.bank_details?.ifsc_code || "",
        branch_address: venue?.bank_details?.branch_address || ""
      }
    }
  });

  useEffect(() => {
    if (venue) {
      reset({
        upi_id: venue?.upi_id || "",
        bank_details: {
          account_number: venue?.bank_details?.account_number || "",
          beneficiary_name: venue?.bank_details?.beneficiary_name || "",
          bank_name: venue?.bank_details?.bank_name || "",
          ifsc_code: venue?.bank_details?.ifsc_code || "",
          branch_address: venue?.bank_details?.branch_address || ""
        }
      });
    }
  }, [venue, reset]);

  const onSubmit = async (values) => {
    try {
      await venueService.update(venue.id, values);
      showSuccess(t("settings.payment.updateSuccess"));
      refetchVenue();
    } catch {
      showError(t("settings.payment.updateError"));
    }
  };

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle={t("settings.payment.pageTitle")}>
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 space-y-4">
          <h4 className="text-sm font-semibold text-gray-800">{t("settings.payment.upi")}</h4>
          <Input label={t("settings.payment.upiIdLabel")} placeholder={t("settings.payment.upiIdPlaceholder")} {...register("upi_id")} />
          <p className="text-xs text-gray-400">
            {t("settings.payment.upiHint")}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 space-y-4">
          <h4 className="text-sm font-semibold text-gray-800">{t("settings.payment.bankTitle")}</h4>
          <p className="text-xs text-gray-400 -mt-2">
            {t("settings.payment.bankHint")}
          </p>

          <Input
            label={t("settings.payment.accountNumber")}
            placeholder={t("settings.payment.accountNumberPh")}
            {...register("bank_details.account_number")}
          />
          <Input
            label={t("settings.payment.beneficiaryName")}
            placeholder={t("settings.payment.beneficiaryNamePh")}
            {...register("bank_details.beneficiary_name")}
          />
          <Input
            label={t("settings.payment.bankName")}
            placeholder={t("settings.payment.bankNamePh")}
            {...register("bank_details.bank_name")}
          />
          <Input
            label={t("settings.payment.ifsc")}
            placeholder={t("settings.payment.ifscPh")}
            {...register("bank_details.ifsc_code")}
          />
          <Input
            label={t("settings.payment.branchAddress")}
            placeholder={t("settings.payment.branchAddressPh")}
            {...register("bank_details.branch_address")}
          />
        </div>

        <Button type="submit" loading={isSubmitting}>{t("settings.payment.save")}</Button>
      </form>
    </DashboardLayout>
  );
}