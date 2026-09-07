module.exports = (sequelize, DataTypes) => {
  const Invoice = sequelize.define("Invoice", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    venue_id: { type: DataTypes.UUID, allowNull: false },
    booking_id: DataTypes.UUID,
    client_id: { type: DataTypes.UUID, allowNull: false },
    type: {
      type: DataTypes.ENUM("quotation", "invoice"),
      allowNull: false
    },
    invoice_number: { type: DataTypes.STRING, unique: true },
    line_items: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    discount_type: { type: DataTypes.STRING(20), defaultValue: "none" },
    discount_value: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    discount_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    taxable_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    gst_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    gst_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 18.00 }, // NEW  - total GST %, split evenly into CGST+SGST
    cgst_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    sgst_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    validity_date: DataTypes.DATEONLY,
    terms: DataTypes.TEXT,
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
      { fields: ["invoice_number"] }
    ]
  });

  return Invoice;
};