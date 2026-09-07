function slugify(text) {
    return (text || "")
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }
  
  // Turns a slug back into a readable label for matching against free-text fields like venue.city
  function unslugify(slug) {
    return (slug || "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  
  module.exports = { slugify, unslugify };