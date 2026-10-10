import api from "./api";

export const metaService = {
  getCities: () => api.get("/meta/cities"),
  getCategories: () => api.get("/meta/categories"),
  getServicesChecklist: (categorySlug) => api.get(`/meta/categories/${categorySlug}/services-checklist`),
  getProfileSchema: (categorySlug, secondary = []) =>
    api.get(`/meta/categories/${categorySlug || "_default"}/profile-schema`, {
      params: secondary.length ? { secondary: secondary.join(",") } : undefined
    }),
  lookupPincode: (pincode) => api.get(`/meta/pincode/${pincode}`),
  getStates: () => api.get("/meta/states"),
  getCitiesForState: (stateCode) => api.get(`/meta/states/${stateCode}/cities`)
};