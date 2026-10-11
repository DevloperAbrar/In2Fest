// One row per successful sign-in. Powers the Super Admin "Login Activity" page.
// Deliberately stores no IP / device data - only who signed in and when.
module.exports = (sequelize, DataTypes) => {
    const LoginEvent = sequelize.define(
      "LoginEvent",
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true
        },
        // super_admin | vendor | team_member | visitor
        actor_type: { type: DataTypes.STRING(20), allowNull: false },
        // users.id (super_admin, vendor) | team_members.id | public_users.id
        actor_id: { type: DataTypes.UUID, allowNull: false },
        // Only known for team members (their venue). NULL for everyone else.
        venue_id: { type: DataTypes.UUID, allowNull: true }
      },
      {
        tableName: "login_events",
        updatedAt: false,
        indexes: [
          { name: "login_events_created_idx", fields: ["created_at"] },
          { name: "login_events_actor_idx", fields: ["actor_type", "actor_id", "created_at"] }
        ]
      }
    );
  
    return LoginEvent;
  };