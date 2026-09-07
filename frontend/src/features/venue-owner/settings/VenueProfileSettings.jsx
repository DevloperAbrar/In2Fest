import React from "react";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import MultiSelect from "../../../components/common/MultiSelect";
import { useFetch } from "../../../hooks/useFetch";
import { useState } from "react";
import Button from "../../../components/common/Button";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { BASE_DOMAIN } from "../../../lib/constants";
import { translateCategory } from "../../../lib/i18nLabels";

// Dev mein: royal.localhost:5173
// Production mein: royal.campussafar.com
const getSubdomainUrl = (subdomain) => {
  const isDev = import.meta.env.DEV;
  if (isDev) {
    return `http://${subdomain}.localhost:5173`;
  }
  return `https://${subdomain}.${BASE_DOMAIN}`;
};

export default function VenueProfileSettings() {
  const { t, i18n } = useTranslation();
  const { venue, refetchVenue } = useVenue();
  const { register, handleSubmit, setValue, watch, reset, formState: { isSubmitting } } = useForm({
    defaultValues: venue ? {
      hall_name: venue.hall_name,
      owner_name: venue.owner_name,
      phone: venue.phone,
      city: venue.city,
      address: venue.address,
      google_maps_link: venue.google_maps_link,
      capacity: venue.capacity,
      venue_type: venue.venue_type,
    } : {}
  });

  useEffect(() => {
    if (venue) {
      reset({
        hall_name: venue.hall_name,
        owner_name: venue.owner_name,
        phone: venue.phone,
        city: venue.city,
        address: venue.address,
        google_maps_link: venue.google_maps_link,
        capacity: venue.capacity,
        venue_type: venue.venue_type,
      });
    }
  }, [venue, reset]);

  const [selectedStateIso, setSelectedStateIso] = useState("");
  const { data: states, loading: statesLoading } = useFetch("/meta/states");
    // Live venue-type list  - pulled from Category Manager (super admin) via
  // the DB, not hardcoded. Only categories flagged is_venue_type show here.
  const { data: categories } = useFetch("/meta/categories");
  const venueTypeOptions = (categories || [])
    .map((c) => ({ value: c.slug, label: translateCategory(c, i18n.language) }));
  const { data: citiesForState, loading: citiesLoading } = useFetch(
    selectedStateIso ? `/meta/states/${selectedStateIso}/cities` : null
  );

  const stateOptions = [
    { value: "", label: statesLoading ? t("settings.venueProfile.loadingStates") : t("settings.venueProfile.changeState") },
    ...(states || []).map((s) => ({ value: s.iso2, label: s.name }))
  ];

  const currentCity = watch("city");
  const cityOptions = [
    { value: "", label: citiesLoading ? t("settings.venueProfile.loadingCities") : t("settings.venueProfile.selectCity") },
    ...(currentCity && !(citiesForState || []).some((c) => c.name === currentCity)
      ? [{ value: currentCity, label: currentCity }]
      : []),
    ...(citiesForState || []).map((c) => ({ value: c.name, label: c.name }))
  ];

  const onSubmit = async (values) => {
    try {
      await venueService.update(venue.id, values);
      showSuccess(t("settings.venueProfile.updateSuccess"));
      refetchVenue();
    } catch {
      showError(t("settings.venueProfile.updateError"));
    }
  };

  const subdomainUrl = venue?.subdomain ? getSubdomainUrl(venue.subdomain) : null;

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle={t("settings.venueProfile.pageTitle")}>

      {/* Subdomain URL Card */}
      {subdomainUrl && (
        <div className="max-w-lg mb-6 bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-sm font-medium text-purple-700 mb-1">{t("settings.venueProfile.publicUrlLabel")}</p>
          <div className="flex items-center gap-2">
            
             <a href={subdomainUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 font-semibold text-sm underline break-all"
            >
              {subdomainUrl}
            </a>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(subdomainUrl);
                showSuccess(t("settings.venueProfile.urlCopied"));
              }}
              className="ml-auto shrink-0 text-xs bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700"
            >
              {t("settings.venueProfile.copy")}
            </button>
          </div>
          <p className="text-xs text-purple-500 mt-2">
            {t("settings.venueProfile.shareHint", { subdomain: venue.subdomain })}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg bg-white p-6 rounded-xl border border-gray-100 space-y-4">
        <Input label={t("settings.venueProfile.hallName")} {...register("hall_name")} />
        <Input label={t("settings.venueProfile.ownerName")} {...register("owner_name")} />
        <Input label={t("settings.venueProfile.phone")} {...register("phone")} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("settings.venueProfile.city")}</label>
          <div className="grid grid-cols-2 gap-3">
            <Select
              options={stateOptions}
              value={selectedStateIso}
              onChange={(e) => setSelectedStateIso(e.target.value)}
            />
            <Select
              options={cityOptions}
              value={currentCity || ""}
              onChange={(e) => setValue("city", e.target.value, { shouldValidate: true })}
            />
          </div>
        </div>
        <Input label={t("settings.venueProfile.address")} {...register("address")} />
        <Input label={t("settings.venueProfile.mapsLink")} {...register("google_maps_link")} />
        <Input label={t("settings.venueProfile.capacity")} type="number" {...register("capacity")} />
        <MultiSelect
          label={t("settings.venueProfile.venueType")}
          options={venueTypeOptions}
          value={watch("venue_type") || []}
          onChange={(val) => setValue("venue_type", val, { shouldValidate: true })}
          placeholder={t("settings.venueProfile.venueTypePlaceholder")}
        />
        <Button type="submit" loading={isSubmitting}>{t("settings.venueProfile.save")}</Button>
      </form>
    </DashboardLayout>
  );
}