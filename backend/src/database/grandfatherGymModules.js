// One-time migration: Workouts and Store used to come with "gym". They are separate plan features now,
// so every existing plan that has "gym" gets both once. Nobody who uses them today loses anything.
// A flag row makes sure it never runs again (so a plan you create later with Store unticked stays that way).
// Body Measurement (gym_body) is NOT given here: it is a paid add-on.
const { sequelize } = require("../config/database");

const FLAG = "gym_modules_split_v1";

async function grandfatherGymModules() {
  await sequelize.query(
    `CREATE TABLE IF NOT EXISTS schema_flags (
       flag_key VARCHAR(80) PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`
  );

  const t = await sequelize.transaction();
  try {
    const [claimed] = await sequelize.query(
      `INSERT INTO schema_flags (flag_key) VALUES (:k) ON CONFLICT (flag_key) DO NOTHING RETURNING flag_key`,
      { replacements: { k: FLAG }, transaction: t }
    );
    if (!claimed || claimed.length === 0) {
      await t.rollback(); // already done earlier (or another server is doing it right now)
      return;
    }

    for (const key of ["gym_workouts", "gym_store"]) {
      await sequelize.query(
        `UPDATE plans
            SET features = features || :add::jsonb
          WHERE features @> '["gym"]'::jsonb
            AND NOT (features @> :probe::jsonb)`,
        { replacements: { add: JSON.stringify([key]), probe: JSON.stringify([key]) }, transaction: t }
      );
    }
    await t.commit();
    console.log("[MIGRATE] gym workouts + store added to existing gym plans");
  } catch (e) {
    try { await t.rollback(); } catch (_) { /* already finished */ }
    throw e;
  }
}

module.exports = { grandfatherGymModules };