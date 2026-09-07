import * as yup from "yup";

export const venueDetailsSchema = yup.object({
  hall_name: yup.string().required("Hall name is required"),
  owner_name: yup.string().required("Owner name is required"),
  phone: yup.string().matches(/^[0-9]{10}$/, "Enter a valid 10-digit phone number").required(),
  city: yup.string().required("City is required"),
  address: yup.string().required("Address is required"),
  capacity: yup.number().positive().integer().required("Capacity is required"),
  venue_type: yup.array().of(yup.string()).min(1, "Select at least one venue type").required("Venue type is required")
});

// Slot schema is intentionally permissive  - per-field validation
// is handled inline in SlotForm.jsx based on the selected pricing_type.
export const slotSchema = yup.object({
  name: yup.string().required("Slot name is required"),
  pricing_type: yup.string().oneOf(["time_slot", "full_day", "hourly", "package"]),
  start_time: yup.string().nullable(),
  end_time: yup.string().nullable(),
  base_price: yup.number().min(0).nullable(),
  weekend_price: yup.number().min(0).nullable(),
  price_per_hour: yup.number().min(0).nullable(),
  min_hours: yup.number().integer().min(1).nullable(),
  max_hours: yup.number().integer().min(1).nullable(),
  duration_label: yup.string().nullable(),
  description: yup.string().nullable(),
});

export const inquiryFormSchema = yup.object({
  customer_name: yup.string().required("Name is required"),
  phone: yup.string().matches(/^[0-9]{10}$/, "Enter a valid 10-digit phone number").required(),
  email: yup.string().email("Enter a valid email").nullable(),
  event_date: yup.string().required("Event date is required"),
  event_type: yup.string().required("Event type is required"),
  guest_count: yup.number().positive().integer().required("Guest count is required"),
  message: yup.string().nullable()
});

export const adminLoginSchema = yup.object({
  email: yup.string().email().required("Email is required"),
  password: yup.string().required("Password is required")
});

export const teamLoginSchema = yup.object({
  email: yup.string().email().required("Email is required"),
  password: yup.string().required("Password is required")
});

export const planSchema = yup.object({
  name: yup.string().required("Plan name is required"),
  monthly_price: yup.number().positive().required("Price is required"),
  trial_days: yup.number().min(0).required()
});

export function getBusinessDetailsSchema(group) {
  const base = {
    hall_name: yup.string().required("Business name is required"),
    owner_name: yup.string().required("Owner name is required"),
    phone: yup.string().matches(/^[0-9]{10}$/, "Enter a valid 10-digit phone number").required(),
    city: yup.string().required("City is required")
  };

  if (group === "venue") {
    return yup.object({
      ...base,
      address: yup.string().required("Address is required"),
      capacity: yup.number().positive().integer().required("Capacity is required"),
      google_maps_link: yup.string().nullable()
    });
  }

  return yup.object({
    ...base,
    primary_locality: yup.string().required("Service area / locality is required"),
    team_size: yup.number().positive().integer().nullable(),
    starting_price: yup.number().positive().nullable()
  });
}