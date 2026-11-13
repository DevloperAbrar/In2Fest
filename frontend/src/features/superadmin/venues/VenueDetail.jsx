import React, { useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { adminSidebarItems } from "../adminSidebarItems.js";
import { useFetch } from "../../../hooks/useFetch";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import Loader from "../../../components/common/Loader";
import VenueActions from "./VenueActions.jsx";
import PlanAssignFields, { EMPTY_ASSIGN, validateAssign } from "./PlanAssignFields.jsx";
import { subscriptionService } from "../../../services/subscriptionService";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { formatDate, formatCurrency } from "../../../lib/formatters";
import { BASE_DOMAIN } from "../../../lib/constants";

const FIELD_LABELS = {
  business_category: "Business category",
  long_description: "About (150+ words)",
  specialty_tagline: "Specialty tagline",
  primary_locality: "Primary locality",
  whatsapp_number: "WhatsApp number",
  starting_price: "Starting price",
  cancellation_policy: "Cancellation policy",
  marketplace_services: "Services list",
  video_intro_url: "Video introduction link"
};

function ChangePlanPanel({ venue, onDone, onCancel }) {
  const { data: plans, loading } = useFetch("/plans");
  const [assign, setAssign] = useState({
    ...EMPTY_ASSIGN,
    billing_cycle: venue.subscription?.billing_cycle === "monthly" ? "monthly" : "yearly"
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const updateAssign = (patch) => {
    setAssign((a) => ({ ...a, ...patch }));
    setError(null);
  };

  const save = async () => {
    if (!assign.plan_id) {
      showError("Please select a plan");
      return;
    }
    const validationError = validateAssign(assign, plans);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      await subscriptionService.adminAssign(venue.id, {
        planId: assign.plan_id,
        billingCycle: assign.billing_cycle,
        paymentReceived: assign.payment_received,
        paymentMethod: assign.payment_method,
        amount: assign.amount,
        notes: assign.notes
      });
      showSuccess("Plan updated");
      onDone();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to update plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <PlanAssignFields
        value={assign}
        onChange={updateAssign}
        plans={plans}
        loading={loading}
        placeholder="Select a plan"
        error={error}
      />
      <div className="flex gap-2">
        <Button onClick={save} loading={saving}>Save plan</Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// Edit business name, owner, phone, city and main category on the vendor's behalf.
function EditDetailsPanel({ venue, categories, cities, onDone, onCancel }) {
  const [form, setForm] = useState({
    hall_name: venue.hall_name || "",
    owner_name: venue.owner_name || "",
    phone: venue.phone || "",
    city: venue.city || "",
    business_category: venue.business_category || ""
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  // Keep the vendor's current city selectable even if it is missing from the cities list.
  const cityNames = Array.from(new Set([venue.city, ...(cities || []).map((c) => c.name)].filter(Boolean)));

  // Group categories by their business type so the long list is easy to scan.
  const groupMap = new Map();
  (categories || []).forEach((c) => {
    const label = c.business_type_label || "Other";
    if (!groupMap.has(label)) groupMap.set(label, []);
    groupMap.get(label).push({ value: c.slug, label: c.name });
  });
  const groups = [...groupMap.entries()].map(([label, options]) => ({ label, options }));

  const categoryChanged = form.business_category !== venue.business_category;

  const validate = () => {
    const next = {};
    if (form.hall_name.trim().length < 2) next.hall_name = "Business name is required";
    if (form.owner_name.trim().length < 2) next.owner_name = "Owner name is required";
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) next.phone = "Enter a valid phone number";
    if (!form.city) next.city = "Select a city";
    if (!form.business_category) next.business_category = "Select a category";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    if (
      categoryChanged &&
      !window.confirm(
        "Changing the category changes the tools this vendor sees and their marketplace link. " +
        "Their data is kept. Continue?"
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      await venueService.adminUpdate(venue.id, form);
      showSuccess("Vendor details updated");
      onDone();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to update vendor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Business / venue name" value={form.hall_name} onChange={update("hall_name")} error={errors.hall_name} />
        <Input label="Owner name" value={form.owner_name} onChange={update("owner_name")} error={errors.owner_name} />
        <Input label="Phone" value={form.phone} onChange={update("phone")} error={errors.phone} />
        <Select
          label="City"
          value={form.city}
          onChange={update("city")}
          error={errors.city}
          options={[{ value: "", label: "Select a city" }, ...cityNames.map((n) => ({ value: n, label: n }))]}
        />
      </div>

      <Select
        label="Main category"
        value={form.business_category}
        onChange={update("business_category")}
        error={errors.business_category}
        options={[{ value: "", label: "Select a category" }]}
        groups={groups}
      />

      {categoryChanged && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          The marketplace link of this vendor will change to the new category
          (/city/<strong>{form.business_category}</strong>/{venue.subdomain}). The old link will stop working.
          The website link ({venue.subdomain}.{BASE_DOMAIN}) stays the same.
        </p>
      )}

      <div className="flex gap-2">
        <Button onClick={save} loading={saving}>Save changes</Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export default function VenueDetail() {
  const { id } = useParams();
  const { data: venue, loading, refetch } = useFetch(`/venues/${id}`);
  const { data: categories } = useFetch("/meta/categories");
  const { data: cities } = useFetch("/meta/cities");
  const [changingPlan, setChangingPlan] = useState(false);
  const [editing, setEditing] = useState(false);

  if (loading) return <Loader fullScreen />;
  if (!venue) return null;

  const completion = venue.marketplace_completion;

  // Categories this vendor is enrolled in: the main one first, then the extra ones.
  const nameOf = (slug) => (categories || []).find((c) => c.slug === slug)?.name || slug;
  const typeLabelOf = (slug) => (categories || []).find((c) => c.slug === slug)?.business_type_label;
  const mainCategory = venue.business_category;
  const extraCategories = Array.isArray(venue.secondary_categories) ? venue.secondary_categories : [];

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle={venue.hall_name}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" title="Venue Details">
          {!editing && (
            <>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-gray-400">Business name</dt><dd>{venue.hall_name}</dd></div>
                <div><dt className="text-gray-400">Owner</dt><dd>{venue.owner_name}</dd></div>
                <div><dt className="text-gray-400">Phone</dt><dd>{venue.phone}</dd></div>
                <div><dt className="text-gray-400">Email</dt><dd>{venue.owner?.email || "-"}</dd></div>
                <div><dt className="text-gray-400">City</dt><dd>{venue.city}</dd></div>
                <div><dt className="text-gray-400">Capacity</dt><dd>{venue.capacity}</dd></div>
                <div><dt className="text-gray-400">Subdomain</dt><dd>{venue.subdomain}.{BASE_DOMAIN}</dd></div>
                <div><dt className="text-gray-400">Live</dt><dd>{venue.is_live ? "Yes" : "No"}</dd></div>
                <div className="col-span-2">
                  <dt className="text-gray-400 mb-1">Enrolled category</dt>
                  <dd className="flex flex-wrap items-center gap-2">
                    {mainCategory ? (
                      <span className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full font-medium">
                        {nameOf(mainCategory)} (main)
                      </span>
                    ) : (
                      <span className="text-gray-400">Not set</span>
                    )}
                    {extraCategories.map((slug) => (
                      <span key={slug} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                        {nameOf(slug)}
                      </span>
                    ))}
                    {mainCategory && typeLabelOf(mainCategory) && (
                      <span className="text-xs text-gray-400">· {typeLabelOf(mainCategory)}</span>
                    )}
                  </dd>
                </div>
              </dl>
              <Button variant="outline" className="mt-4" onClick={() => setEditing(true)}>
                Edit details
              </Button>
            </>
          )}

          {editing && (
            <EditDetailsPanel
              venue={venue}
              categories={categories}
              cities={cities}
              onCancel={() => setEditing(false)}
              onDone={() => {
                setEditing(false);
                refetch();
              }}
            />
          )}
        </Card>

        <Card title="Subscription">
          <p className="text-sm mb-1">Plan: <strong>{venue.subscription?.plan?.name || "-"}</strong></p>
          <p className="text-sm mb-1">Locked Price: {formatCurrency(venue.subscription?.locked_price)}</p>
          <p className="text-sm mb-2">Status: <Badge status={venue.subscription?.status} /></p>
          <p className="text-xs text-gray-400">Renews: {formatDate(venue.subscription?.current_period_end)}</p>

          {!changingPlan && (
            <Button variant="outline" className="mt-4" onClick={() => setChangingPlan(true)}>
              Change plan
            </Button>
          )}

          {changingPlan && (
            <ChangePlanPanel
              venue={venue}
              onCancel={() => setChangingPlan(false)}
              onDone={() => {
                setChangingPlan(false);
                refetch();
              }}
            />
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Marketplace Listing">
          <div className="flex items-center gap-3 mb-3">
            <Badge status={venue.marketplace_listed ? "listed" : "not_listed"}>
              {venue.marketplace_listed ? "Listed on Marketplace" : "Not Listed on Marketplace"}
            </Badge>
            {completion && (
              <span className="text-sm text-gray-500">{completion.percentage}% profile complete</span>
            )}
          </div>

          {completion && completion.missing_fields.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Missing before this venue can go live:</p>
              <ul className="flex flex-wrap gap-2">
                {completion.missing_fields.map((field) => (
                  <li key={field} className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-full">
                    {FIELD_LABELS[field] || field}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {completion && completion.missing_fields.length === 0 && !venue.marketplace_listed && (
            <p className="text-sm text-gray-500">
              Profile is complete but not yet marked listed. Ask the owner to re-save any field on the
              Marketplace Profile page to trigger the listing flag.
            </p>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <VenueActions venue={venue} onUpdated={refetch} />
      </div>
    </DashboardLayout>
  );
}