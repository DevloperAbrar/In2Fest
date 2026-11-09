// Runs from startupMigrations.js. Creates tables, then (ONCE each, tracked in lib_migrations):
//  - adds the "library" feature to existing plans that include billing
//  - creates the "Library / Study Room" category as INACTIVE, so nothing changes for anyone
//    until Super Admin switches it on in Category Manager.
const { sequelize, ensure } = require("./library.models");

async function runOnce(key, fn) {
  const [rows] = await sequelize.query(
    `INSERT INTO lib_migrations (key) VALUES (:key) ON CONFLICT (key) DO NOTHING RETURNING key`,
    { replacements: { key } }
  );
  if (rows && rows.length) await fn();
}

async function ensureLibrarySchema() {
  await ensure();

  await runOnce("plan_feature_v1", () =>
    sequelize.query(
      `UPDATE plans
          SET features = COALESCE(features, '[]'::jsonb) || '["library"]'::jsonb
        WHERE jsonb_typeof(COALESCE(features, '[]'::jsonb)) = 'array'
          AND jsonb_exists(COALESCE(features, '[]'::jsonb), 'billing')
          AND NOT jsonb_exists(COALESCE(features, '[]'::jsonb), 'library')`
    )
  );

  await runOnce("category_v1", () =>
    sequelize.query(
      `INSERT INTO categories (name, slug, icon, display_order, active, is_venue_type, business_type, tagline, show_on_home)
       SELECT 'Library / Study Room', 'study-library', 'library', 140, false, false, 'library', 'Study seats by shift', true
        WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'study-library')`
    )
  );
}

module.exports = { ensureLibrarySchema };