const service = require("./teamMember.service");

async function create(req, res, next) {
  try {
    const teamMember = await service.createTeamMember(req.params.venueId, req.body);
    res.status(201).json({ success: true, data: teamMember });
  } catch (error) { next(error); }
}

async function list(req, res, next) {
  try {
    const members = await service.listTeamMembers(req.params.venueId);
    res.json({ success: true, data: members });
  } catch (error) { next(error); }
}

async function update(req, res, next) {
  try {
    const teamMember = await service.updateTeamMember(req.params.venueId, req.params.teamMemberId, req.body);
    res.json({ success: true, data: teamMember });
  } catch (error) { next(error); }
}

async function remove(req, res, next) {
  try {
    await service.deleteTeamMember(req.params.venueId, req.params.teamMemberId);
    res.json({ success: true, message: "Team member removed" });
  } catch (error) { next(error); }
}

module.exports = { create, list, update, remove };