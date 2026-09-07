const planService = require("./plan.service");

async function createPlan(req, res, next) {
  try {
    const plan = await planService.createPlan(req.body);
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
}

async function getAllPlans(req, res, next) {
  try {
    const includeInactive = req.user && req.user.role === "super_admin";
    const plans = await planService.getAllPlans(includeInactive);
    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
}

async function getPlan(req, res, next) {
  try {
    const plan = await planService.getPlanById(req.params.id);
    res.json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
}

async function updatePlan(req, res, next) {
  try {
    const plan = await planService.updatePlan(req.params.id, req.body);
    res.json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
}

async function deletePlan(req, res, next) {
  try {
    await planService.deletePlan(req.params.id);
    res.json({ success: true, message: "Plan deleted successfully" });
  } catch (error) {
    next(error);
  }
}

module.exports = { createPlan, getAllPlans, getPlan, updatePlan, deletePlan };