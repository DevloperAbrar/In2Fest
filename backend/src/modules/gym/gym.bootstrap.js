// Creates gym tables (CREATE TABLE IF NOT EXISTS via Model.sync) and seeds the built-in
// exercise library. Called from startupMigrations.js, so no manual migration is needed.
const { EXERCISE_SEED } = require("./gym.constants");

async function ensureGymSchema() {
  const models = require("../../database/models");
  const order = ["GymSettings", "GymPlan", "GymMember", "GymMembership", "GymPayment", "GymExercise", "GymWorkoutPlan", "GymLead"];
  for (const name of order) await models[name].sync();

  const existing = await models.GymExercise.count({ where: { venue_id: null } });
  if (existing === 0) {
    await models.GymExercise.bulkCreate(
      EXERCISE_SEED.map(([name, body_part, equipment]) => ({ name, body_part, equipment, venue_id: null }))
    );
  }
}

module.exports = { ensureGymSchema };