module.exports = (sequelize, DataTypes) => {
  const Invoice = sequelize.define("Invoice", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    venue_id: { type: DataTypes.UUID, allowNull: false },
    booking_id: DataTypes.UUID,
    client_id: { type: DataTypes.UUID, allowNull: true }, // null = walk-in / one-off customer
    customer_snapshot: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    type: {
      type: DataTypes.ENUM("quotation", "invoice", "proforma", "credit_note"),
      allowNull: false
    },
    invoice_number: { type: DataTypes.STRING },
    line_items: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    discount_type: { type: DataTypes.STRING(20), defaultValue: "none" },
    discount_value: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    discount_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    taxable_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    gst_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    gst_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 18.0 }, // single slab rate; 0 when mixed (see tax_breakup)
    cgst_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    sgst_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    igst_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    tax_breakup: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    supply_type: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "intra" }, // intra | inter
    place_of_supply: DataTypes.STRING(2),
    price_includes_tax: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    round_off: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
    total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    amount_paid: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    balance_due: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    payment_status: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "unpaid" }, // unpaid | partial | paid
    payments: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    validity_date: DataTypes.DATEONLY,
    due_date: DataTypes.DATEONLY,
    payment_terms: DataTypes.STRING(100),
    terms: DataTypes.TEXT,
    notes: DataTypes.TEXT,
    custom_fields: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    converted_to: DataTypes.UUID,
    qr_code_url: DataTypes.STRING,
    pdf_url: DataTypes.STRING,
    status: {
      type: DataTypes.ENUM("draft", "sent", "paid"),
      defaultValue: "draft"
    }
  }, {
    tableName: "invoices",
    indexes: [
      { fields: ["venue_id"] },
      { unique: true, fields: ["venue_id", "invoice_number"] }
    ]
  });

  return Invoice;
};