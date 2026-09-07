export function slugify(text) {
    return (text || "")
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }
  
  export function titleCase(slug) {
    return (slug || "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }