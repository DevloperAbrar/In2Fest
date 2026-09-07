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
    is_venue_type: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, {
    tableName: "categories",
    timestamps: false
  });

  return Category;
};