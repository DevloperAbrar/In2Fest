import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { adminSidebarItems } from "../adminSidebarItems.js";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import Button from "../../../components/common/Button";
import { useFetch } from "../../../hooks/useFetch";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { ArrowLeft } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AddVendor() {
  const navigate = useNavigate();
  const { data: categories, loading: categoriesLoading } = useFetch("/meta/categories");

  const [form, setForm] = useState({
    owner_name: "",
    owner_email: "",
    hall_name: "",
    phone: "",
    city: "",
    business_category: ""
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.owner_email.trim()) next.owner_email = "Vendor's email is required";
    else if (!EMAIL_RE.test(form.owner_email.trim())) next.owner_email = "Enter a valid email address";
    if (!form.hall_name.trim()) next.hall_name = "Business / venue name is required";
    if (!form.owner_name.trim()) next.owner_name = "Vendor's name is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { data } = await venueService.adminCreate(form);
      const venueId = data.data.venue.id;

      if (data.data.already_existed) {
        showSuccess(`${data.data.owner.email} already has an account  - opening their dashboard`);
      } else {
        showSuccess(`Vendor account created for ${data.data.owner.email}`);
      }

      // Immediately open the new dashboard as this vendor so setup can be
      // finished right away  - same flow as the "Impersonate" action.
      try {
        const impersonateRes = await venueService.impersonate(venueId);
        const token = impersonateRes.data.data.accessToken;
        window.open(`/auth/callback?token=${encodeURIComponent(token)}&mode=impersonate`, "_blank");
      } catch {
        // Non-fatal  - the vendor was created either way, admin can
        // impersonate later from the venue list/detail page.
      }

      navigate(`/admin/venues/${venueId}`);
    } catch (err) {
      showError(err.response?.data?.message || "Failed to create vendor");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Add Vendor">
      <button
        onClick={() => navigate("/admin/venues")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={15} /> Back to venues
      </button>

      <div className="max-w-lg bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-navy-900 mb-1">Onboard a vendor</h2>
        <p className="text-sm text-gray-500 mb-6">
          Set this up with just the vendor's email  - no password needed from them. We'll open
          their dashboard in a new tab so you can finish setup on their behalf. Later, when they
          sign in with Google using this same email, they'll land on the exact same dashboard.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Vendor's name"
            placeholder="e.g. Rahul Sharma"
            value={form.owner_name}
            onChange={update("owner_name")}
            error={errors.owner_name}
          />
          <Input
            label="Vendor's email"
            type="email"
            placeholder="vendor@example.com"
            value={form.owner_email}
            onChange={update("owner_email")}
            error={errors.owner_email}
          />
          <p className="text-xs text-gray-400 -mt-3">
            This is the email the vendor will use to sign in with Google later.
          </p>

          <Input
            label="Business / venue name"
            placeholder="e.g. Grand Palace Banquet"
            value={form.hall_name}
            onChange={update("hall_name")}
            error={errors.hall_name}
          />
          <Select
            label="Category"
            value={form.business_category}
            onChange={update("business_category")}
            options={[
              { value: "", label: categoriesLoading ? "Loading..." : "Select a category" },
              ...(categories || []).map((c) => ({ value: c.slug, label: c.name }))
            ]}
          />
          <Input label="Phone" placeholder="10-digit mobile number" value={form.phone} onChange={update("phone")} />
          <Input label="City" placeholder="e.g. Indore" value={form.city} onChange={update("city")} />

          <div className="pt-2 flex gap-3">
            <Button type="submit" loading={submitting}>
              Create &amp; continue as vendor
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/admin/venues")}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}