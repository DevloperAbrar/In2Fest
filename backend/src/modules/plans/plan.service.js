const { Plan, Subscription } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const { getPlanPricing, MAX_DISCOUNT } = require("./planPricing");

// Plain JSON of the plan + computed pricing (final prices, offer status, savings)
function withPricing(plan) {
  const json = plan.toJSON ? plan.toJSON() : plan;
  return { ...json, pricing: getPlanPricing(json) };
}

function toEndOfDay(value) {
  if (!value) return null;
  const str = String(value);
  const date = str.length <= 10 ? new Date(`${str}T23:59:59`) : new Date(str);
  if (Number.isNaN(date.getTime())) throw new AppError("Invalid offer end date", 400);
  return date;
}

function sanitizePricingFields(input) {
  const out = {};

  if (input.yearly_price !== undefined) {
    if (input.yearly_price === null || input.yearly_price === "") {
      out.yearly_price = null;
    } else {
      const yearly = Number(input.yearly_price);
      if (!(yearly >= 0)) throw new AppError("Yearly price must be a positive number", 400);
      out.yearly_price = yearly > 0 ? yearly : null;
    }
  }

  if (input.discount_percent !== undefined) {
    const discount = Math.round(Number(input.discount_percent) || 0);
    if (discount < 0 || discount > MAX_DISCOUNT) {
      throw new AppError(`Discount must be between 0% and ${MAX_DISCOUNT}%`, 400);
    }
    out.discount_percent = discount;
  }

  if (input.offer_name !== undefined) {
    out.offer_name = String(input.offer_name || "").trim() || null;
  }

  if (input.offer_ends_at !== undefined) {
    out.offer_ends_at = toEndOfDay(input.offer_ends_at);
  }

  // No discount = no offer label / expiry
  if (out.discount_percent === 0) {
    out.offer_name = null;
    out.offer_ends_at = null;
  }

  return out;
}

async function createPlan(payload) {
  const plan = await Plan.create({
    name: payload.name,
    description: payload.description,
    monthly_price: payload.monthly_price,
    features: payload.features || [],
    trial_days: payload.trial_days || 0,
    is_active: payload.is_active !== undefined ? payload.is_active : true,
    ...sanitizePricingFields(payload)
  });
  return withPricing(plan);
}

async function getAllPlans(includeInactive = false) {
  const where = includeInactive ? {} : { is_active: true };
  const plans = await Plan.findAll({ where, order: [["monthly_price", "ASC"]] });
  return plans.map(withPricing);
}

async function getPlanById(id) {
  const plan = await Plan.findByPk(id);
  if (!plan) throw new AppError("Plan not found", 404);
  return plan;
}

async function updatePlan(id, updates) {
  const plan = await getPlanById(id);

  // Note: changing prices here does NOT affect existing subscribers.
  // Subscription.locked_price is what they actually pay  - see subscription.service.js
  const allowedFields = ["name", "description", "monthly_price", "features", "trial_days", "is_active"];
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) plan[field] = updates[field];
  });
  Object.assign(plan, sanitizePricingFields(updates));

  await plan.save();
  return withPricing(plan);
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

module.exports = { createPlan, getAllPlans, getPlanById, updatePlan, deletePlan, withPricing };