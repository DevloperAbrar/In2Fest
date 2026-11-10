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
    const isAdmin = !!req.user && req.user.role === "super_admin";

    // The answer depends on who asks, so a cache must never share it between callers.
    res.set("Vary", "Authorization");
    if (isAdmin) res.set("Cache-Control", "no-store");

    // Super admin: every plan (including hidden ones) + subscriber counts.
    // Everyone else: visible plans only.
    const plans = await planService.getAllPlans(isAdmin);
    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
}

async function getPlan(req, res, next) {
  try {
    const plan = await planService.getPlanById(req.params.id);
    res.json({ success: true, data: planService.withPricing(plan) });
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

// Body: { visible: true | false }
async function setVisibility(req, res, next) {
  try {
    const raw = req.body ? req.body.visible : undefined;
    const visible =
      raw === true || raw === "true" ? true : raw === false || raw === "false" ? false : undefined;
    const plan = await planService.setPlanVisibility(req.params.id, visible);
    res.json({
      success: true,
      message: visible ? "Plan is now visible to new vendors" : "Plan is now hidden from new vendors",
      data: plan
    });
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

module.exports = { createPlan, getAllPlans, getPlan, updatePlan, setVisibility, deletePlan };