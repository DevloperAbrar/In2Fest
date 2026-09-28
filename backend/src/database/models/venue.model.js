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
    venue_type: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      get() {
        const stored = this.getDataValue("venue_type");
        if (Array.isArray(stored) && stored.length > 0) return stored;
        const secondary = this.getDataValue("secondary_categories");
        return Array.from(
          new Set(
            [this.getDataValue("business_category"), ...(Array.isArray(secondary) ? secondary : [])].filter(Boolean)
          )
        );
      }
    },

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

    // ===== V2 — Marketplace Profile fields =====
    business_category: DataTypes.STRING,
    secondary_categories: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },

    year_established: DataTypes.INTEGER,
    total_events_completed: DataTypes.INTEGER,
    team_size: DataTypes.INTEGER,
    languages_spoken: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },

    starting_price: DataTypes.DECIMAL(10, 2),
    maximum_price: DataTypes.DECIMAL(10, 2),
    pricing_note: DataTypes.TEXT,
    advance_payment_percentage: DataTypes.INTEGER,
    cancellation_policy: DataTypes.TEXT,

    long_description: DataTypes.TEXT,
    specialty_tagline: DataTypes.STRING,
    famous_events_handled: DataTypes.TEXT,
    awards_recognition: DataTypes.TEXT,

    booking_advance_notice_days: { type: DataTypes.INTEGER, defaultValue: 1 },
    peak_season_months: { type: DataTypes.ARRAY(DataTypes.INTEGER), defaultValue: [] },
    off_season_discount_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },

    marketplace_services: { type: DataTypes.JSONB, defaultValue: [] },
    marketplace_services_detail: { type: DataTypes.JSONB, defaultValue: [] },
    service_prices: { type: DataTypes.JSONB, defaultValue: {} },
    pricing_mode: { type: DataTypes.STRING, defaultValue: "single" },

    badge_verified_business: { type: DataTypes.BOOLEAN, defaultValue: false },
    badge_documents_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    badge_premium_partner: { type: DataTypes.BOOLEAN, defaultValue: false },

    marketplace_profile_complete: { type: DataTypes.BOOLEAN, defaultValue: false },
    marketplace_listed: { type: DataTypes.BOOLEAN, defaultValue: false },
    featured_on_homepage: { type: DataTypes.BOOLEAN, defaultValue: false },

    average_rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0 },
    review_count: { type: DataTypes.INTEGER, defaultValue: 0 },

    // ===== Referral fields =====
    referral_code: { type: DataTypes.STRING(20), unique: true },
    referred_by: { type: DataTypes.UUID }
  }, {
    tableName: "venues",
    indexes: [
      { fields: ["subdomain"] },
      { fields: ["owner_id"] },
      { fields: ["city"] },
      { fields: ["referral_code"] }
    ]
  });

  return Venue;
};