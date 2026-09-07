module.exports = (sequelize, DataTypes) => {
    const VendorListing = sequelize.define("VendorListing", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      business_name: { type: DataTypes.STRING, allowNull: false },
      owner_name: { type: DataTypes.STRING, allowNull: false },
      phone: { type: DataTypes.STRING, allowNull: false },
      whatsapp_number: DataTypes.STRING,
      city_id: DataTypes.INTEGER,
      locality: DataTypes.STRING,
      category_id: DataTypes.INTEGER,
      starting_price: DataTypes.DECIMAL(10, 2),
      about: DataTypes.TEXT,
      photos: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
      status: { type: DataTypes.STRING, defaultValue: "pending" }, // pending / active / rejected
      profile_views: { type: DataTypes.INTEGER, defaultValue: 0 },
      inquiry_count: { type: DataTypes.INTEGER, defaultValue: 0 },
      last_milestone_notified: { type: DataTypes.INTEGER, defaultValue: 0 }
    }, {
      tableName: "vendor_listings"
    });
  
    return VendorListing;
  };