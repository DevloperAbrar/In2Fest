// Idempotent schema upgrades that apply themselves at server start.
// Every statement is safe to run repeatedly (IF NOT EXISTS / WHERE NOT EXISTS).
const { getSequelize } = require("../utils/db");
const { NEW_CATEGORIES } = require("../config/businessTypes");

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
  // legacy rows: already-paid invoices become fully paid, everything else owes its total
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

  // ---- atomic document numbering ----
  `CREATE TABLE IF NOT EXISTS invoice_counters (
     venue_id UUID NOT NULL,
     doc_type VARCHAR(20) NOT NULL,
     fy VARCHAR(4) NOT NULL,
     last_value INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (venue_id, doc_type, fy)
   )`
];

// ENUM additions can't run inside a transaction on older Postgres; run individually, tolerate failure.
const ENUM_STATEMENTS = [
  `ALTER TYPE "enum_invoices_type" ADD VALUE IF NOT EXISTS 'proforma'`,
  `ALTER TYPE "enum_invoices_type" ADD VALUE IF NOT EXISTS 'credit_note'`
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errCode = (e) => e?.original?.code || e?.parent?.code;

async function applyAll() {
  const sequelize = getSequelize();
  let missingTable = false;

  for (const sql of SCHEMA_STATEMENTS) {
    try {
      await sequelize.query(sql);
    } catch (e) {
      if (errCode(e) === "42P01") missingTable = true; // table not created by sync() yet
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

  for (let i = 0; i < NEW_CATEGORIES.length; i++) {
    const c = NEW_CATEGORIES[i];
    try {
      await sequelize.query(
        `INSERT INTO categories (name, slug, icon, display_order, active, is_venue_type)
         SELECT :name, :slug, :icon, :order, true, false
         WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = :slug)`,
        { replacements: { name: c.name, slug: c.slug, icon: c.icon, order: 100 + i } }
      );
    } catch (e) {
      if (errCode(e) === "42P01") missingTable = true;
      else console.error("[MIGRATE] category seed failed:", e.message);
    }
  }

  return !missingTable;
}

async function runWithRetry() {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (await applyAll()) return true;
    await sleep(3000); // wait for sequelize.sync() to create base tables on a fresh database
  }
  throw new Error("Startup migrations could not complete: base tables are missing");
}

let pending = null;
function ensureSchema() {
  if (!pending) {
    pending = runWithRetry().catch((err) => {
      pending = null; // allow a later request to retry
      throw err;
    });
  }
  return pending;
}

function kickoff() {
  ensureSchema().catch((e) => console.error("[MIGRATE]", e.message));
}

// Strict: used by billing routes (a missing schema must not silently corrupt data).
const schemaReady = (req, res, next) => ensureSchema().then(() => next()).catch(next);

// Soft: used by public meta routes, never blocks for long and never fails the request.
const schemaReadySoft = (req, res, next) => {
  Promise.race([ensureSchema(), sleep(4000)]).then(() => next()).catch(() => next());
};

module.exports = { ensureSchema, kickoff, schemaReady, schemaReadySoft };