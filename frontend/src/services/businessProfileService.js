import api from "./api";

export const businessProfileService = {
  getForCategory: (categorySlug, secondary = []) =>
    api.get(`/meta/categories/${categorySlug}/business-profile`, {
      params: secondary.length ? { secondary: secondary.join(",") } : undefined
    }),
  listBusinessTypes: () => api.get("/meta/business-types")
};