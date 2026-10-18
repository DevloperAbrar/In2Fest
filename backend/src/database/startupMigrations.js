// Idempotent schema upgrades that apply themselves at server start.
// Every statement is safe to run repeatedly (IF NOT EXISTS / WHERE NOT EXISTS).
const { getSequelize } = require("../utils/db");
const { NEW_CATEGORIES } = require("../config/businessTypes");
const { FIXED_CATEGORIES } = require("../config/categories");
const { refreshCategoryTypes } = require("../utils/categoryTypeCache");

const SCHEMA_STATEMENTS = [
  // ---- invoices ----
  `ALTER TABLE invoices ALTER COLUMN client_id DROP NOT NULL`,
  `ALTER TABLE invoices
     ADD COLUMN IF NOT EXISTS customer_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
     ADD COLUMN IF NOT EXISTS supply_type VARCHAR(10) NOT NULL DEFAULT 'intra',
     ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR(2),
     ADD COLUMN IF NOT EXISTS igst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
     ADD COLUMN IF NOT EXISTS tax_breakup JSONB NOT NULL DEFAULT '[]'::jsonb,
     ADD COLUMN IF NOT EXISTS round_off DECIMAL(6,2) NOT NULL DEFAULT 0,
     ADD COLUMN IF NOT EXISTS price_includes_tax BOOLEAN NOT NULL DEFAULT false,
     ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
     ADD COLUMN IF NOT EXISTS balance_due DECIMAL(12,2) NOT NULL DEFAULT 0,
     ADD COLUMN IF NOT EXISTS payment_status VARCHAR(10) NOT NULL DEFAULT 'unpaid',
     ADD COLUMN IF NOT EXISTS payments JSONB NOT NULL DEFAULT '[]'::jsonb,
     ADD COLUMN IF NOT EXISTS due_date DATE,
     ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100),
     ADD COLUMN IF NOT EXISTS notes TEXT,
     ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
     ADD COLUMN IF NOT EXISTS converted_to UUID`,
  `UPDATE invoices SET amount_paid = total, balance_due = 0, payment_status = 'paid'
     WHERE status = 'paid' AND type <> 'quotation' AND payment_status = 'unpaid' AND amount_paid = 0`,
  `UPDATE invoices SET balance_due = total
     WHERE type <> 'quotation' AND status <> 'paid' AND amount_paid = 0 AND balance_due = 0`,
  `CREATE INDEX IF NOT EXISTS invoices_venue_type_created_idx ON invoices (venue_id, type, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS invoices_venue_payment_status_idx ON invoices (venue_id, payment_status)`,

  // ---- unified item catalog (products + services) ----
  `ALTER TABLE service_items
     ADD COLUMN IF NOT EXISTS item_type VARCHAR(10) NOT NULL DEFAULT 'service',
     ADD COLUMN IF NOT EXISTS unit VARCHAR(20),
     ADD COLUMN IF NOT EXISTS hsn_sac VARCHAR(10),
     ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2),
     ADD COLUMN IF NOT EXISTS sku VARCHAR(50),
     ADD COLUMN IF NOT EXISTS track_stock BOOLEAN NOT NULL DEFAULT false,
     ADD COLUMN IF NOT EXISTS stock_qty DECIMAL(12,2),
     ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`,

  // ---- shop catalog: photo, category, sizes, website visibility ----
  `ALTER TABLE service_items
     ADD COLUMN IF NOT EXISTS image_url TEXT,
     ADD COLUMN IF NOT EXISTS category VARCHAR(80),
     ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]'::jsonb,
     ADD COLUMN IF NOT EXISTS show_on_website BOOLEAN NOT NULL DEFAULT false`,
  `CREATE INDEX IF NOT EXISTS service_items_venue_web_idx ON service_items (venue_id, show_on_website)`,

  // ---- shop inventory + offers ----
  `ALTER TABLE service_items
     ADD COLUMN IF NOT EXISTS mrp DECIMAL(10,2),
     ADD COLUMN IF NOT EXISTS offer_label VARCHAR(60),
     ADD COLUMN IF NOT EXISTS offer_ends_at DATE,
     ADD COLUMN IF NOT EXISTS brand VARCHAR(80),
     ADD COLUMN IF NOT EXISTS barcode VARCHAR(50),
     ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2),
     ADD COLUMN IF NOT EXISTS low_stock_threshold DECIMAL(12,2),
     ADD COLUMN IF NOT EXISTS variant_stock JSONB NOT NULL DEFAULT '{}'::jsonb`,
  `CREATE INDEX IF NOT EXISTS service_items_venue_barcode_idx ON service_items (venue_id, barcode)`,

  // ---- atomic document numbering ----
  `CREATE TABLE IF NOT EXISTS invoice_counters (
     venue_id UUID NOT NULL,
     doc_type VARCHAR(20) NOT NULL,
     fy VARCHAR(4) NOT NULL,
     last_value INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (venue_id, doc_type, fy)
   )`,

  // ---- website display options + opening hours ----
  `ALTER TABLE venues
     ADD COLUMN IF NOT EXISTS show_availability BOOLEAN NOT NULL DEFAULT true,
     ADD COLUMN IF NOT EXISTS show_slots_packages BOOLEAN NOT NULL DEFAULT true,
     ADD COLUMN IF NOT EXISTS business_hours JSONB`,

  // ---- website navbar menu settings ----
  `ALTER TABLE venues
     ADD COLUMN IF NOT EXISTS nav_config JSONB`,

  // ---- category-driven marketplace profile ----
  `ALTER TABLE venues
     ADD COLUMN IF NOT EXISTS profile_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
     ADD COLUMN IF NOT EXISTS pricing_unit VARCHAR(30)`,

  // ---- admin-controlled business type per category ----
  // Nullable on purpose: existing rows are backfilled below without ever
  // overwriting a value the Super Admin has already chosen.
  `ALTER TABLE categories
     ADD COLUMN IF NOT EXISTS business_type VARCHAR(30)`,

  // ---- category home page media ----
  `ALTER TABLE categories
     ADD COLUMN IF NOT EXISTS image_url TEXT,
     ADD COLUMN IF NOT EXISTS tagline VARCHAR(160),
     ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN NOT NULL DEFAULT true`,

  // ---- per-category limit for extra (secondary) categories ----
  `ALTER TABLE categories
     ADD COLUMN IF NOT EXISTS max_secondary_categories INTEGER NOT NULL DEFAULT 2`,

  // ---- Super Admin login activity ----
  `CREATE TABLE IF NOT EXISTS login_events (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     actor_type VARCHAR(20) NOT NULL,
     actor_id UUID NOT NULL,
     venue_id UUID,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS login_events_created_idx ON login_events (created_at)`,
  `CREATE INDEX IF NOT EXISTS login_events_actor_idx ON login_events (actor_type, actor_id, created_at)`,

  // ---- Restaurant suite: give "food" to every existing plan that already has billing ----
  `UPDATE plans
      SET features = COALESCE(features, '[]'::jsonb) || '["food"]'::jsonb
    WHERE jsonb_typeof(COALESCE(features, '[]'::jsonb)) = 'array'
      AND jsonb_exists(COALESCE(features, '[]'::jsonb), 'billing')
      AND NOT jsonb_exists(COALESCE(features, '[]'::jsonb), 'food')`,

  // ---- Restaurant: link website orders to the visitor who placed them ----
  `ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS public_user_id UUID`,
  `CREATE INDEX IF NOT EXISTS food_orders_public_user_idx ON food_orders (venue_id, public_user_id)`
];

const ENUM_STATEMENTS = [
  `ALTER TYPE "enum_invoices_type" ADD VALUE IF NOT EXISTS 'proforma'`,
  `ALTER TYPE "enum_invoices_type" ADD VALUE IF NOT EXISTS 'credit_note'`
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errCode = (e) => e?.original?.code || e?.parent?.code;

// Fills categories.business_type only where it is still NULL.
async function backfillCategoryBusinessTypes(sequelize) {
  const slugsByType = {};
  FIXED_CATEGORIES.forEach((c) => {
    (slugsByType.events = slugsByType.events || []).push(c.slug);
  });
  NEW_CATEGORIES.forEach((c) => {
    (slugsByType[c.business_type] = slugsByType[c.business_type] || []).push(c.slug);
  });

  for (const [type, slugs] of Object.entries(slugsByType)) {
    await sequelize.query(
      `UPDATE categories SET business_type = :type
         WHERE slug IN (:slugs) AND business_type IS NULL`,
      { replacements: { type, slugs } }
    );
  }

  // Anything else (e.g. categories an admin created earlier) keeps the old behaviour: "general".
  await sequelize.query(`UPDATE categories SET business_type = 'general' WHERE business_type IS NULL`);
}

async function applyAll() {
  const sequelize = getSequelize();
  let missingTable = false;

  for (const sql of SCHEMA_STATEMENTS) {
    try {
      await sequelize.query(sql);
    } catch (e) {
      if (errCode(e) === "42P01") missingTable = true;
      else console.error("[MIGRATE] statement failed:", e.message);
    }
  }

  for (const sql of ENUM_STATEMENTS) {
    try {
      await sequelize.query(sql);
    } catch (e) {
      if (errCode(e) === "42P01") missingTable = true;
      else console.error("[MIGRATE] enum update skipped:", e.message);
    }
  }

  try {
    await require("../modules/gym/gym.bootstrap").ensureGymSchema();
  } catch (e) {
    if (errCode(e) === "42P01") missingTable = true;
    else console.error("[MIGRATE] gym schema failed:", e.message);
  }

  try {
    await require("../modules/inventory/inventory.bootstrap").ensureInventorySchema();
  } catch (e) {
    if (errCode(e) === "42P01") missingTable = true;
    else console.error("[MIGRATE] inventory schema failed:", e.message);
  }
  try {
    await require("../modules/orders/orders.bootstrap").ensureOrdersSchema();
  } catch (e) {
    if (errCode(e) === "42P01") missingTable = true;
    else console.error("[MIGRATE] orders schema failed:", e.message);
  }

  try {
    await require("../modules/food/food.bootstrap").ensureFoodSchema();
  } catch (e) {
    if (errCode(e) === "42P01") missingTable = true;
    else console.error("[MIGRATE] food schema failed:", e.message);
  }


  for (let i = 0; i < NEW_CATEGORIES.length; i++) {
    const c = NEW_CATEGORIES[i];
    try {
      await sequelize.query(
        `INSERT INTO categories (name, slug, icon, display_order, active, is_venue_type, business_type)
         SELECT :name, :slug, :icon, :order, true, false, :type
         WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = :slug)`,
        {
          replacements: {
            name: c.name,
            slug: c.slug,
            icon: c.icon,
            order: 100 + i,
            type: c.business_type
          }
        }
      );
    } catch (e) {
      if (errCode(e) === "42P01") missingTable = true;
      else console.error("[MIGRATE] category seed failed:", e.message);
    }
  }

  try {
    await backfillCategoryBusinessTypes(sequelize);
  } catch (e) {
    if (errCode(e) === "42P01") missingTable = true;
    else console.error("[MIGRATE] category business_type backfill failed:", e.message);
  }

  if (!missingTable) {
    try {
      await refreshCategoryTypes();
    } catch (e) {
      console.error("[MIGRATE] category type registry refresh failed:", e.message);
    }
  }

  return !missingTable;
}

async function runWithRetry() {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (await applyAll()) return true;
    await sleep(3000);
  }
  throw new Error("Startup migrations could not complete: base tables are missing");
}

let pending = null;
function ensureSchema() {
  if (!pending) {
    pending = runWithRetry().catch((err) => {
      pending = null;
      throw err;
    });
  }
  return pending;
}

function kickoff() {
  ensureSchema().catch((e) => console.error("[MIGRATE]", e.message));
}

const schemaReady = (req, res, next) => ensureSchema().then(() => next()).catch(next);

const schemaReadySoft = (req, res, next) => {
  Promise.race([ensureSchema(), sleep(4000)]).then(() => next()).catch(() => next());
};

module.exports = { ensureSchema, kickoff, schemaReady, schemaReadySoft };