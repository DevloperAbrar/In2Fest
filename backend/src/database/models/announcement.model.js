module.exports = (sequelize, DataTypes) => {
    const Announcement = sequelize.define("Announcement", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      image_url: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      link_url: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    }, {
      tableName: "announcements",
      indexes: [
        { fields: ["is_active"] },
        { fields: ["display_order"] }
      ]
    });
  
    return Announcement;
  };