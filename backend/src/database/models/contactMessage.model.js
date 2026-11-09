module.exports = (sequelize, DataTypes) => {
    const ContactMessage = sequelize.define(
      "ContactMessage",
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true
        },
        name: { type: DataTypes.STRING(100), allowNull: false },
        email: { type: DataTypes.STRING(150), allowNull: false },
        // Stored as +91XXXXXXXXXX when the visitor gives one (optional)
        phone: { type: DataTypes.STRING(20) },
        topic: {
          type: DataTypes.STRING(30),
          allowNull: false,
          defaultValue: "general"
        },
        message: { type: DataTypes.TEXT, allowNull: false },
        status: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "new",
          validate: { isIn: [["new", "read", "resolved"]] }
        },
        read_at: { type: DataTypes.DATE }
      },
      {
        // Indexes for this table are created in startupMigrations.js
        tableName: "contact_messages"
      }
    );
  
    return ContactMessage;
  };