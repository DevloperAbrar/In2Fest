const { Plan, Subscription } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");

async function createPlan(payload) {
  return Plan.create({
    name: payload.name,
    description: payload.description,
    monthly_price: payload.monthly_price,
    features: payload.features || [],
    trial_days: payload.trial_days || 0,
    is_active: payload.is_active !== undefined ? payload.is_active : true
  });
}

async function getAllPlans(includeInactive = false) {
  const where = includeInactive ? {} : { is_active: true };
  return Plan.findAll({ where, order: [["monthly_price", "ASC"]] });
}

async function getPlanById(id) {
  const plan = await Plan.findByPk(id);
  if (!plan) throw new AppError("Plan not found", 404);
  return plan;
}

async function updatePlan(id, updates) {
  const plan = await getPlanById(id);

  // Note: changing monthly_price here does NOT affect existing subscribers.
  // Subscription.locked_price is what they actually pay  - see subscription.service.js
  const allowedFields = ["name", "description", "monthly_price", "features", "trial_days", "is_active"];
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) plan[field] = updates[field];
  });

  await plan.save();
  return plan;
}

async function deletePlan(id) {
  const plan = await getPlanById(id);

  const subscriberCount = await Subscription.count({ where: { plan_id: id } });
  if (subscriberCount > 0) {
    throw new AppError(
      `This plan has ${subscriberCount} vendor(s) subscribed to it and can't be deleted. Deactivate it instead so no new vendors can pick it.`,
      409
    );
  }

  await plan.destroy();
  return true;
}

module.exports = { createPlan, getAllPlans, getPlanById, updatePlan, deletePlan };