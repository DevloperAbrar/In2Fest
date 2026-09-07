module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define("User", {
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
      password_hash: {
        type: DataTypes.STRING,
        allowNull: true // null for Google OAuth owners
      },
      google_id: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
      },
      role: {
        type: DataTypes.ENUM("super_admin", "venue_owner", "team_member"),
        allowNull: false,
        defaultValue: "venue_owner"
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    }, {
      tableName: "users",
      indexes: [
        { fields: ["email"] },
        { fields: ["role"] }
      ]
    });
  
    return User;
  };