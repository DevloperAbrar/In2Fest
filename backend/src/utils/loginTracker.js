const { LoginEvent } = require("../database/models");

const ACTOR_TYPES = ["super_admin", "vendor", "team_member", "visitor"];

/**
 * Records a successful sign-in. Fire-and-forget on purpose:
 *  - it must never slow down or fail a login, and
 *  - the server shuts down on any unhandled rejection, so the promise is always caught.
 */
function recordLogin({ actorType, actorId, venueId = null }) {
  if (!ACTOR_TYPES.includes(actorType) || !actorId) return;

  LoginEvent.create({ actor_type: actorType, actor_id: actorId, venue_id: venueId }).catch((err) => {
    console.error("[LOGIN-TRACK] Could not record login:", err.message);
  });
}

module.exports = { recordLogin };