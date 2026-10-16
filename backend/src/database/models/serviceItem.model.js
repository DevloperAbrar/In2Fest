module.exports = (sequelize, DataTypes) => {
  const ServiceItem = sequelize.define("ServiceItem", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    venue_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    default_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    description: DataTypes.STRING,
    item_type: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "service" }, // service | product
    unit: DataTypes.STRING(20),
    hsn_sac: DataTypes.STRING(10),
    tax_rate: DataTypes.DECIMAL(5, 2),
    sku: DataTypes.STRING(50),
    track_stock: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    stock_qty: DataTypes.DECIMAL(12, 2), // total across sizes. Changed only through the stock ledger.
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

    // ---- shop catalog (shown on the vendor website) ----
    image_url: DataTypes.TEXT,
    category: DataTypes.STRING(80),
    variants: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] }, // [{ label: "M" }]
    show_on_website: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

    // ---- offers + inventory ----
    mrp: DataTypes.DECIMAL(10, 2), // printed price; discount % = (mrp - price) / mrp
    offer_label: DataTypes.STRING(60), // e.g. "Diwali Sale"
    offer_ends_at: DataTypes.DATEONLY,
    brand: DataTypes.STRING(80),
    barcode: DataTypes.STRING(50),
    cost_price: DataTypes.DECIMAL(10, 2), // last purchase cost
    low_stock_threshold: DataTypes.DECIMAL(12, 2), // null = default (5)
    variant_stock: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} } // { "M": 4, "L": 2 }
  }, {
    tableName: "service_items",
    indexes: [{ fields: ["venue_id"] }]
  });

  return ServiceItem;
};