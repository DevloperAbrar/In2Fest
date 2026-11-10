const { Op } = require("sequelize");
const { Plan, Subscription } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");
const { getPlanPricing, MAX_DISCOUNT } = require("./planPricing");

// Plain JSON of the plan + computed pricing (final prices, offer status, savings)
function withPricing(plan) {
  const json = plan.toJSON ? plan.toJSON() : plan;
  return { ...json, pricing: getPlanPricing(json) };
}

function toBool(value) {
  return value === true || value === "true";
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

// { [planId]: number of vendors subscribed to it }
async function getSubscriberCounts() {
  const rows = await Subscription.count({ group: ["plan_id"] });
  const map = {};
  (rows || []).forEach((row) => {
    map[row.plan_id] = Number(row.count) || 0;
  });
  return map;
}

/**
 * Hiding a plan only stops NEW vendors from picking it. The one thing we protect:
 * free signups need at least one visible free plan, so the last one cannot be hidden.
 */
async function assertCanHide(plan) {
  if (Number(plan.monthly_price) > 0) return;
  const otherVisibleFree = await Plan.count({
    where: { monthly_price: 0, is_active: true, id: { [Op.ne]: plan.id } }
  });
  if (otherVisibleFree === 0) {
    throw new AppError(
      "This is your only visible free plan. New vendors need one to start with, so create another free plan first or keep this one visible.",
      409
    );
  }
}

async function createPlan(payload) {
  const plan = await Plan.create({
    name: payload.name,
    description: payload.description,
    monthly_price: payload.monthly_price,
    features: payload.features || [],
    trial_days: payload.trial_days || 0,
    is_active: payload.is_active !== undefined ? toBool(payload.is_active) : true,
    gst_inclusive: toBool(payload.gst_inclusive),
    ...sanitizePricingFields(payload)
  });
  return withPricing(plan);
}

/**
 * includeInactive = true  (super admin): all plans, hidden ones too, with subscriber_count.
 * includeInactive = false (everyone else): visible plans only.
 */
async function getAllPlans(includeInactive = false) {
  const where = includeInactive ? {} : { is_active: true };
  const plans = await Plan.findAll({ where, order: [["monthly_price", "ASC"]] });

  if (!includeInactive) return plans.map(withPricing);

  const counts = await getSubscriberCounts();
  return plans.map((plan) => ({ ...withPricing(plan), subscriber_count: counts[plan.id] || 0 }));
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
  const allowedFields = ["name", "description", "monthly_price", "features", "trial_days"];
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) plan[field] = updates[field];
  });
  Object.assign(plan, sanitizePricingFields(updates));

  // Visible / hidden
  if (updates.is_active !== undefined) {
    const nextActive = toBool(updates.is_active);
    if (!nextActive && plan.is_active) await assertCanHide(plan);
    plan.is_active = nextActive;
  }

  // Switching between "GST included" and "GST extra" changes what renewing vendors pay,
  // so it is only allowed while nobody is subscribed to this plan.
  if (updates.gst_inclusive !== undefined) {
    const next = toBool(updates.gst_inclusive);
    if (next !== !!plan.gst_inclusive) {
      const subscriberCount = await Subscription.count({ where: { plan_id: id } });
      if (subscriberCount > 0) {
        throw new AppError(
          `This plan has ${subscriberCount} vendor(s) on it, so the GST setting can't be changed. Create a new plan and deactivate this one.`,
          409
        );
      }
      plan.gst_inclusive = next;
    }
  }

  await plan.save();
  return withPricing(plan);
}

/**
 * Hide (visible = false) or unhide (visible = true) a plan for NEW vendors.
 * Vendors already on the plan keep their features, price and renewal.
 */
async function setPlanVisibility(id, visible) {
  if (typeof visible !== "boolean") {
    throw new AppError("visible must be true or false", 400);
  }

  const plan = await getPlanById(id);

  if (!!plan.is_active !== visible) {
    if (!visible) await assertCanHide(plan);
    plan.is_active = visible;
    await plan.save();
  }

  const subscriberCount = await Subscription.count({ where: { plan_id: id } });
  return { ...withPricing(plan), subscriber_count: subscriberCount };
}

async function deletePlan(id) {
  const plan = await getPlanById(id);

  const subscriberCount = await Subscription.count({ where: { plan_id: id } });
  if (subscriberCount > 0) {
    throw new AppError(
      `This plan has ${subscriberCount} vendor(s) subscribed to it and can't be deleted. Hide it instead so no new vendors can pick it.`,
      409
    );
  }

  await plan.destroy();
  return true;
}

module.exports = {
  createPlan,
  getAllPlans,
  getPlanById,
  updatePlan,
  setPlanVisibility,
  deletePlan,
  withPricing
};