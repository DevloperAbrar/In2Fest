const express = require("express");
const controller = require("./teamMember.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { requireVenueOwnership } = require("../../middleware/venueOwnership.middleware");

const router = express.Router({ mergeParams: true });

// Venue owner ONLY  - team members can never create/edit/remove other team
// members, regardless of their own permissions. This is intentionally not
// opened up to role "team_member".
router.use(authenticate, requireVenueOwnership, requireRole("venue_owner"));

router.post("/", controller.create);
router.get("/", controller.list);
router.patch("/:teamMemberId", controller.update);
router.delete("/:teamMemberId", controller.remove);

module.exports = router;