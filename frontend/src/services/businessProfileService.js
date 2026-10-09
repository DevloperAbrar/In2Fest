import api from "./api";

export const businessProfileService = {
  getForCategory: (categorySlug) => api.get(`/meta/categories/${categorySlug}/business-profile`),
  listBusinessTypes: () => api.get("/meta/business-types")
};