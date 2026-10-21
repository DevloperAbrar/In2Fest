// Creates gym tables (CREATE TABLE IF NOT EXISTS via Model.sync) and keeps the built-in
// exercise library up to date. Called from startupMigrations.js, so no manual migration is needed.
const { EXERCISE_SEED } = require("./gym.constants");

// Adds any built-in exercise that is missing and fixes the body part / equipment of existing ones
// (for example "Barbell Curl" moves from "arms" to "biceps"). Gym-owned exercises are never touched.
async function syncBuiltInExercises(models) {
  const { sequelize, GymExercise } = models;
  await sequelize.transaction(async (t) => {
    await sequelize.query("SELECT pg_advisory_xact_lock(727001)", { transaction: t });
    const rows = await GymExercise.findAll({ where: { venue_id: null }, transaction: t });
    const byName = new Map(rows.map((r) => [r.name, r]));
    const toAdd = [];
    for (const [name, body_part, equipment] of EXERCISE_SEED) {
      const cur = byName.get(name);
      if (!cur) toAdd.push({ name, body_part, equipment, venue_id: null });
      else if (cur.body_part !== body_part || cur.equipment !== equipment) await cur.update({ body_part, equipment }, { transaction: t });
    }
    if (toAdd.length) await GymExercise.bulkCreate(toAdd, { transaction: t });
  });
}

async function ensureGymSchema() {
  const models = require("../../database/models");
  const order = ["GymSettings", "GymPlan", "GymMember", "GymMembership", "GymPayment", "GymExercise", "GymWorkoutPlan", "GymLead"];
  for (const name of order) await models[name].sync();

  await syncBuiltInExercises(models);
  await require("./gym.message.models").ensure();
  await require("./gym.store.models").ensure();
}

module.exports = { ensureGymSchema };