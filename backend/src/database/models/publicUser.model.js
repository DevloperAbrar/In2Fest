module.exports = (sequelize, DataTypes) => {
    const PublicUser = sequelize.define("PublicUser", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true }
      },
      google_id: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
      },
      avatar_url: {
        type: DataTypes.STRING,
        allowNull: true
      }
    }, {
      tableName: "public_users",
      indexes: [
        { fields: ["email"] }
      ]
    });
  
    return PublicUser;
  };