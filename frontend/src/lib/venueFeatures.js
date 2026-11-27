// The ONE place that answers "which features can this vendor use now?" on the frontend:
// the plan's features + the add-ons the vendor has bought or been given.
export function getVenueFeatures(venue) {
    const fromPlan = venue?.subscription?.plan?.features;
    const base = Array.isArray(fromPlan) ? fromPlan : [];
    const addons = Array.isArray(venue?.active_addons) ? venue.active_addons : [];
    return addons.length ? [...new Set([...base, ...addons])] : base;
  }
  
  export const hasVenueFeature = (venue, key) => getVenueFeatures(venue).includes(key);