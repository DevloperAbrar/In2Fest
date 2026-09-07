module.exports = (sequelize, DataTypes) => {
  const Venue = sequelize.define("Venue", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    owner_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    hall_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    subdomain: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    owner_name: DataTypes.STRING,
    phone: DataTypes.STRING,
    city: DataTypes.STRING,
    address: DataTypes.TEXT,
    google_maps_link: DataTypes.STRING,
    capacity: DataTypes.INTEGER,
    venue_type: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },

    // Website builder fields
    template_id: { type: DataTypes.STRING, defaultValue: "template-1" },
    theme_color: { type: DataTypes.STRING, defaultValue: "#7c3aed" },
    hero_image_url: DataTypes.STRING,
    hero_heading: DataTypes.STRING,
    hero_subheading: DataTypes.STRING,
    hero_button_text: { type: DataTypes.STRING, defaultValue: "Enquire Now" },
    about_text: DataTypes.TEXT,
    about_highlights: { type: DataTypes.JSONB, defaultValue: [] },
    services: { type: DataTypes.JSONB, defaultValue: [] },
    gallery: { type: DataTypes.JSONB, defaultValue: [] },
    testimonials: { type: DataTypes.JSONB, defaultValue: [] },
    show_pricing_section: { type: DataTypes.BOOLEAN, defaultValue: true },

    // Dynamic section library  - ordered array of { type, visible, config }.
    // Core types (hero/about/services/gallery/testimonials/contact) reference
    // the dedicated columns above; new pluggable types carry their own config.
    // Nullable/additive  - legacy venues get a default computed on read.
    page_sections: { type: DataTypes.JSONB, defaultValue: null },

    // Payment/GST settings
    upi_id: DataTypes.STRING,
    bank_details: DataTypes.JSONB,
    gst_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    gst_number: DataTypes.STRING,

    is_live: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    setup_completed_steps: { type: DataTypes.JSONB, defaultValue: [] },

    last_login_at: DataTypes.DATE,

    // ===== V2  - Marketplace Profile fields (additive, all nullable) =====

    // Identity and contact
    business_category: DataTypes.STRING,
    secondary_categories: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
    whatsapp_number: DataTypes.STRING,
    instagram_handle: DataTypes.STRING,
    youtube_channel_link: DataTypes.STRING,
    external_website: DataTypes.STRING,
    video_intro_url: DataTypes.STRING,

    // Location and service area
    primary_locality: DataTypes.STRING,
    full_pincode: DataTypes.STRING,
    service_travel_note: DataTypes.TEXT,

    // Business information
    year_established: DataTypes.INTEGER,
    total_events_completed: DataTypes.INTEGER,
    team_size: DataTypes.INTEGER,
    languages_spoken: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },

    // Pricing
    starting_price: DataTypes.DECIMAL(10, 2),
    maximum_price: DataTypes.DECIMAL(10, 2),
    pricing_note: DataTypes.TEXT,
    advance_payment_percentage: DataTypes.INTEGER,
    cancellation_policy: DataTypes.TEXT,

    // Extended description
    long_description: DataTypes.TEXT,
    specialty_tagline: DataTypes.STRING,
    famous_events_handled: DataTypes.TEXT,
    awards_recognition: DataTypes.TEXT,

    // Availability
    booking_advance_notice_days: { type: DataTypes.INTEGER, defaultValue: 1 },
    peak_season_months: { type: DataTypes.ARRAY(DataTypes.INTEGER), defaultValue: [] },
    off_season_discount_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },

    // Services checklist for the marketplace (separate from V1 website-builder `services`)
    marketplace_services: { type: DataTypes.JSONB, defaultValue: [] },

    service_prices: { type: DataTypes.JSONB, defaultValue: {} },
    pricing_mode: { type: DataTypes.STRING, defaultValue: "single" }, // "single" or "per_service"

    // Verification  - admin-controlled only, never editable by the owner
    badge_verified_business: { type: DataTypes.BOOLEAN, defaultValue: false },
    badge_documents_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    badge_premium_partner: { type: DataTypes.BOOLEAN, defaultValue: false },

    // Marketplace visibility
    marketplace_profile_complete: { type: DataTypes.BOOLEAN, defaultValue: false },
    marketplace_listed: { type: DataTypes.BOOLEAN, defaultValue: false },
    featured_on_homepage: { type: DataTypes.BOOLEAN, defaultValue: false },

    // Rating cache (kept updated by the review module in Phase 5)
    average_rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0 },
    review_count: { type: DataTypes.INTEGER, defaultValue: 0 }
  }, {
    tableName: "venues",
    indexes: [
      { fields: ["subdomain"] },
      { fields: ["owner_id"] },
      { fields: ["city"] }
    ]
  });

  return Venue;
};