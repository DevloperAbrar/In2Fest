module.exports = (sequelize, DataTypes) => {
    const City = sequelize.define("City", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      name: { type: DataTypes.STRING, allowNull: false },
      slug: { type: DataTypes.STRING, allowNull: false, unique: true },
      state: { type: DataTypes.STRING, allowNull: false },
      state_slug: { type: DataTypes.STRING, allowNull: false },
      latitude: DataTypes.DECIMAL(10, 7),
      longitude: DataTypes.DECIMAL(10, 7),
      active: { type: DataTypes.BOOLEAN, defaultValue: true }
    }, {
      tableName: "cities",
      indexes: [
        { fields: ["slug"] },
        { fields: ["state_slug"] }
      ]
    });
  
    return City;
  };