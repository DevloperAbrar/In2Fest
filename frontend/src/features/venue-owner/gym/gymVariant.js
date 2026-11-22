import { useBusinessProfile } from "../../../hooks/useBusinessProfile";

// What each account type calls things. "gym" is the original behaviour and never changes.
export const VARIANT_TERMS = {
  gym: { key: "gym", pageTitle: "Gym", person: "Member", people: "Members", plans: "Plans", batch: "Shift", batches: "Shifts" },
  academy: { key: "academy", pageTitle: "Academy", person: "Student", people: "Students", plans: "Fee plans", batch: "Batch", batches: "Batches" },
  studio: { key: "studio", pageTitle: "Studio", person: "Member", people: "Members", plans: "Packages", batch: "Class", batches: "Classes" }
};

// Reads the vendor's functionality (segment) from the business profile.
export function useGymVariant() {
  const { profile, loading } = useBusinessProfile();
  const seg = profile?.segment?.key;
  const variant = seg === "academy" || seg === "studio" ? seg : "gym";
  return { variant, terms: VARIANT_TERMS[variant], isGym: variant === "gym", ready: Boolean(profile) || !loading };
}