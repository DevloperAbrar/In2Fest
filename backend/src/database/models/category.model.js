module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define("Category", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    icon: DataTypes.STRING,
    display_order: { type: DataTypes.INTEGER, defaultValue: 0 },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    is_venue_type: { type: DataTypes.BOOLEAN, defaultValue: false },
    // Which business type (events, education, retail ...) this category belongs to.
    // Controlled by Super Admin. Drives the labels, questions and modules a vendor sees.
    // NULL is allowed on purpose: it is resolved to a default at read time.
    business_type: { type: DataTypes.STRING(30), allowNull: true },
    // Tile image shown on the discovery home page (uploaded by Super Admin to R2).
    image_url: { type: DataTypes.TEXT, allowNull: true },
    // Short line shown under the category name on the home page.
    tagline: { type: DataTypes.STRING(160), allowNull: true },
    // Super Admin can hide a category from the home page without deactivating it.
    show_on_home: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  }, {
    tableName: "categories",
    timestamps: false
  });

  return Category;
};