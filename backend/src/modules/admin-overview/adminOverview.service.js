const os = require("os");
const { QueryTypes } = require("sequelize");
const { sequelize } = require("../../database/models");
const { PLAN_FEATURES } = require("../../config/planFeatures");
const { getRedisClient } = require("../../config/redis");
const { AppError } = require("../../middleware/error.middleware");
const metrics = require("../../utils/metrics");
const backup = require("../../jobs/dbBackup");
// All "today / this month" boundaries follow Indian time, not server time.
const TZ = "Asia/Kolkata";

// One subscription row per venue (the newest), so a stray duplicate row can never double-count a venue.
const LATEST_SUBS = `SELECT DISTINCT ON (venue_id) * FROM subscriptions ORDER BY venue_id, created_at DESC`;

// Monthly-equivalent revenue of one subscription row (yearly plans are divided by 12).
const MONTHLY_VALUE = `CASE WHEN s.billing_cycle = 'yearly' THEN s.locked_price / 12.0 ELSE s.locked_price END`;

// A "paying" subscription is a live, non-trial subscription with a price above zero.
const IS_PAYING = `(s.status IN ('active', 'expiring_soon') AND s.locked_price > 0)`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SUB_STATUSES = ["trial", "active", "expiring_soon", "expired", "suspended"];

const run = (sql, replacements = {}) =>
  sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

const one = async (sql, replacements) => (await run(sql, replacements))[0] || {};

const num = (value) => Number(value) || 0;

// Turns every numeric-looking value of a flat row into a Number (pg returns COUNT/SUM as strings).
function numberize(row, keys) {
  const out = { ...row };
  keys.forEach((k) => {
    out[k] = num(row[k]);
  });
  return out;
}

const pct = (part, whole) => (whole > 0 ? +((part / whole) * 100).toFixed(1) : 0);

// ───────────────────────────── SUMMARY ─────────────────────────────

async function getSummary() {
  const [accounts, subs, noSub, payments, logins, listing, demand] = await Promise.all([
    one(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'venue_owner') AS owners_total,
        (SELECT COUNT(*) FROM users u WHERE u.role = 'venue_owner'
           AND NOT EXISTS (SELECT 1 FROM venues v WHERE v.owner_id = u.id)) AS owners_without_venue,
        (SELECT COUNT(*) FROM venues) AS venues_total,
        (SELECT COUNT(*) FROM venues WHERE is_active = true) AS venues_active,
        (SELECT COUNT(*) FROM venues WHERE is_active = false) AS venues_suspended,
        (SELECT COUNT(*) FROM team_members) AS team_members,
        (SELECT COUNT(*) FROM public_users) AS visitors_total,
        (SELECT COUNT(*) FROM venues WHERE created_at >= now() - interval '7 days') AS venues_7d,
        (SELECT COUNT(*) FROM venues WHERE created_at >= now() - interval '30 days') AS venues_30d,
        (SELECT COUNT(*) FROM public_users WHERE created_at >= now() - interval '7 days') AS visitors_7d,
        (SELECT COUNT(*) FROM public_users WHERE created_at >= now() - interval '30 days') AS visitors_30d
    `),
    one(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE s.status = 'trial') AS trial,
        COUNT(*) FILTER (WHERE s.status = 'trial' AND s.trial_ends_at IS NOT NULL
                           AND s.trial_ends_at <= now() + interval '3 days') AS trial_ending_3d,
        COUNT(*) FILTER (WHERE ${IS_PAYING}) AS paying,
        COUNT(*) FILTER (WHERE s.status IN ('active', 'expiring_soon') AND s.locked_price = 0) AS free_plan,
        COUNT(*) FILTER (WHERE s.status = 'expiring_soon') AS expiring_soon,
        COUNT(*) FILTER (WHERE ${IS_PAYING} AND s.current_period_end IS NOT NULL
                           AND s.current_period_end <= now() + interval '7 days') AS renewals_due_7d,
        COUNT(*) FILTER (WHERE s.status = 'expired') AS expired,
        COUNT(*) FILTER (WHERE s.status = 'suspended') AS suspended,
        COALESCE(SUM(CASE WHEN ${IS_PAYING} THEN ${MONTHLY_VALUE} END), 0) AS mrr
      FROM (${LATEST_SUBS}) s
    `),
    one(`SELECT COUNT(*) AS n FROM venues v WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.venue_id = v.id)`),
    one(`
      WITH b AS (
        SELECT
          (date_trunc('month', now() AT TIME ZONE '${TZ}')) AT TIME ZONE '${TZ}' AS this_month_start,
          (date_trunc('month', now() AT TIME ZONE '${TZ}') - interval '1 month') AT TIME ZONE '${TZ}' AS last_month_start
      )
      SELECT
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'success'), 0) AS total_collected,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'success' AND p.created_at >= b.this_month_start), 0) AS this_month,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'success'
          AND p.created_at >= b.last_month_start AND p.created_at < b.this_month_start), 0) AS last_month,
        COUNT(*) FILTER (WHERE p.status = 'pending') AS pending_count,
        COUNT(*) FILTER (WHERE p.status = 'failed' AND p.created_at >= now() - interval '30 days') AS failed_30d
      FROM payments p CROSS JOIN b
    `),
    one(`
      WITH b AS (SELECT (now() AT TIME ZONE '${TZ}')::date::timestamp AT TIME ZONE '${TZ}' AS today_start)
      SELECT
        COUNT(*) AS total,
        MIN(le.created_at) AS tracking_since,
        COUNT(*) FILTER (WHERE le.created_at >= b.today_start) AS today,
        COUNT(*) FILTER (WHERE le.created_at >= now() - interval '7 days') AS last_7d,
        COUNT(*) FILTER (WHERE le.created_at >= now() - interval '30 days') AS last_30d,
        COUNT(DISTINCT le.actor_id) FILTER (WHERE le.created_at >= now() - interval '24 hours') AS unique_24h,
        COUNT(DISTINCT le.actor_id) FILTER (WHERE le.created_at >= now() - interval '7 days') AS unique_7d,
        COUNT(DISTINCT le.actor_id) FILTER (WHERE le.created_at >= now() - interval '30 days') AS unique_30d
      FROM login_events le CROSS JOIN b
    `),
    one(`
      SELECT
        (SELECT COUNT(*) FROM vendor_listings) AS fl_total,
        (SELECT COUNT(*) FROM vendor_listings WHERE status = 'pending') AS fl_pending,
        (SELECT COUNT(*) FROM vendor_listings WHERE status = 'active') AS fl_active,
        (SELECT COUNT(*) FROM vendor_listings WHERE status = 'rejected') AS fl_rejected,
        (SELECT COUNT(*) FROM venues WHERE marketplace_listed = true AND is_active = true) AS listed,
        (SELECT COUNT(*) FROM venues WHERE marketplace_profile_complete = true) AS profile_complete,
        (SELECT COUNT(*) FROM venues WHERE featured_on_homepage = true) AS featured
    `),
    one(`
      SELECT
        (SELECT COUNT(*) FROM inquiries) AS inquiries_total,
        (SELECT COUNT(*) FROM inquiries WHERE created_at >= now() - interval '7 days') AS inquiries_7d,
        (SELECT COUNT(*) FROM inquiries WHERE created_at >= now() - interval '30 days') AS inquiries_30d,
        (SELECT COUNT(*) FROM inquiries WHERE source = 'marketplace' AND created_at >= now() - interval '30 days') AS marketplace_30d,
        (SELECT COUNT(*) FROM reviews WHERE status = 'pending') AS reviews_pending,
        (SELECT COUNT(*) FROM city_requests WHERE status = 'pending') AS city_requests_pending,
        (SELECT COUNT(*) FROM whatsapp_messages WHERE status = 'failed' AND created_at >= now() - interval '30 days') AS whatsapp_failed_30d
    `)
  ]);

  const { mrr: mrrRaw, ...subCounts } = subs;
  const mrr = Math.round(num(mrrRaw));
  const paying = num(subCounts.paying);
  const thisMonth = num(payments.this_month);
  const lastMonth = num(payments.last_month);

  return {
    generatedAt: new Date().toISOString(),
    accounts: {
      ...numberize(accounts, [
        "owners_total", "owners_without_venue", "venues_total", "venues_active", "venues_suspended",
        "team_members", "visitors_total", "venues_7d", "venues_30d", "visitors_7d", "visitors_30d"
      ])
    },
    logins: {
      ...numberize(logins, ["total", "today", "last_7d", "last_30d", "unique_24h", "unique_7d", "unique_30d"]),
      tracking_since: logins.tracking_since || null
    },
    subscriptions: {
      ...numberize(subCounts, [
        "total", "trial", "trial_ending_3d", "paying", "free_plan", "expiring_soon",
        "renewals_due_7d", "expired", "suspended"
      ]),
      no_subscription: num(noSub.n)
    },
    revenue: {
      mrr,
      arr: mrr * 12,
      arpu: paying > 0 ? Math.round(mrr / paying) : 0,
      total_collected: Math.round(num(payments.total_collected)),
      this_month: Math.round(thisMonth),
      last_month: Math.round(lastMonth),
      growth_pct: lastMonth > 0 ? +(((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1) : null,
      pending_payments: num(payments.pending_count),
      failed_payments_30d: num(payments.failed_30d)
    },
    listing: numberize(listing, [
      "fl_total", "fl_pending", "fl_active", "fl_rejected", "listed", "profile_complete", "featured"
    ]),
    demand: numberize(demand, [
      "inquiries_total", "inquiries_7d", "inquiries_30d", "marketplace_30d",
      "reviews_pending", "city_requests_pending", "whatsapp_failed_30d"
    ])
  };
}

// ───────────────────────────── REGISTRATIONS ─────────────────────────────

function likePattern(search) {
  const escaped = String(search).trim().replace(/[\\%_]/g, (c) => `\\${c}`);
  return `%${escaped}%`;
}

function parsePaging(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 25, 1), 100);
  return { page, limit, offset: (page - 1) * limit };
}

async function getRegistrations(query = {}) {
  const type = ["vendors", "no_business", "visitors"].includes(query.type) ? query.type : "vendors";
  const { page, limit, offset } = parsePaging(query);
  const search = String(query.search || "").trim().slice(0, 100);
  const like = search ? likePattern(search) : null;

  const [counts, plans] = await Promise.all([
    one(`
      SELECT
        (SELECT COUNT(*) FROM venues) AS vendors,
        (SELECT COUNT(*) FROM users u WHERE u.role = 'venue_owner'
           AND NOT EXISTS (SELECT 1 FROM venues v WHERE v.owner_id = u.id)) AS no_business,
        (SELECT COUNT(*) FROM public_users) AS visitors
    `),
    run(`SELECT id, name FROM plans ORDER BY monthly_price ASC, name ASC`)
  ]);

  const where = [];
  const replacements = { limit, offset };
  if (like) replacements.like = like;

  let listSql;
  let countSql;

  if (type === "vendors") {
    if (like) {
      where.push(`(v.hall_name ILIKE :like OR v.owner_name ILIKE :like OR v.phone ILIKE :like
                   OR v.city ILIKE :like OR v.subdomain ILIKE :like OR u.email ILIKE :like)`);
    }

    if (query.plan === "none") {
      where.push(`s.id IS NULL`);
    } else if (query.plan) {
      if (!UUID_RE.test(query.plan)) throw new AppError("Invalid plan filter", 400);
      where.push(`s.plan_id = :planId`);
      replacements.planId = query.plan;
    }

    if (query.status) {
      if (!SUB_STATUSES.includes(query.status)) throw new AppError("Invalid status filter", 400);
      where.push(`s.status = :subStatus`);
      replacements.subStatus = query.status;
    }

    if (query.listed === "true" || query.listed === "false") {
      where.push(`v.marketplace_listed = ${query.listed === "true" ? "true" : "false"}`);
    }
    if (query.active === "true" || query.active === "false") {
      where.push(`v.is_active = ${query.active === "true" ? "true" : "false"}`);
    }

    const from = `
      FROM venues v
      LEFT JOIN users u ON u.id = v.owner_id
      LEFT JOIN (${LATEST_SUBS}) s ON s.venue_id = v.id
      LEFT JOIN plans p ON p.id = s.plan_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`;

    countSql = `SELECT COUNT(*) AS n ${from}`;
    listSql = `
      SELECT v.id, v.hall_name, v.owner_name, v.phone, v.city, v.subdomain, v.business_category,
             v.is_active, v.marketplace_listed, v.created_at,
             u.email AS owner_email, u.last_login_at,
             s.plan_id, p.name AS plan_name, s.status AS sub_status, s.locked_price,
             s.billing_cycle, s.trial_ends_at, s.current_period_end
      ${from}
      ORDER BY v.created_at DESC
      LIMIT :limit OFFSET :offset`;
  } else if (type === "no_business") {
    if (like) where.push(`(u.name ILIKE :like OR u.email ILIKE :like)`);
    const from = `
      FROM users u
      WHERE u.role = 'venue_owner'
        AND NOT EXISTS (SELECT 1 FROM venues v WHERE v.owner_id = u.id)
        ${where.length ? `AND ${where.join(" AND ")}` : ""}`;
    countSql = `SELECT COUNT(*) AS n ${from}`;
    listSql = `
      SELECT u.id, u.name, u.email, u.is_active, u.created_at, u.last_login_at
      ${from}
      ORDER BY u.created_at DESC
      LIMIT :limit OFFSET :offset`;
  } else {
    if (like) where.push(`(pu.name ILIKE :like OR pu.email ILIKE :like)`);
    const from = `FROM public_users pu ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`;
    countSql = `SELECT COUNT(*) AS n ${from}`;
    listSql = `
      SELECT pu.id, pu.name, pu.email, pu.created_at,
        (SELECT COUNT(*) FROM saved_vendors sv WHERE sv.public_user_id = pu.id) AS saved_count,
        (SELECT COUNT(*) FROM reviews r WHERE r.reviewer_user_id = pu.id AND r.reviewer_role = 'visitor') AS review_count,
        (SELECT MAX(le.created_at) FROM login_events le
           WHERE le.actor_type = 'visitor' AND le.actor_id = pu.id) AS last_login_at
      ${from}
      ORDER BY pu.created_at DESC
      LIMIT :limit OFFSET :offset`;
  }

  const [totalRow, rows] = await Promise.all([one(countSql, replacements), run(listSql, replacements)]);
  const total = num(totalRow.n);

  return {
    type,
    rows: rows.map((r) => ({
      ...r,
      ...(r.locked_price !== undefined ? { locked_price: num(r.locked_price) } : {}),
      ...(r.saved_count !== undefined ? { saved_count: num(r.saved_count), review_count: num(r.review_count) } : {})
    })),
    counts: numberize(counts, ["vendors", "no_business", "visitors"]),
    plans,
    pagination: { total, page, limit, pages: Math.max(Math.ceil(total / limit), 1) }
  };
}

// ───────────────────────────── LOGIN ACTIVITY ─────────────────────────────

async function getLogins(query = {}) {
  const requested = parseInt(query.days, 10);
  const days = [7, 14, 30, 90].includes(requested) ? requested : 14;

  const [series, byType, recent, topVendors, atRisk, overall] = await Promise.all([
    run(
      `
      WITH days AS (
        SELECT d::date AS day FROM generate_series(
          (now() AT TIME ZONE '${TZ}')::date - (CAST(:days AS integer) - 1),
          (now() AT TIME ZONE '${TZ}')::date,
          interval '1 day'
        ) AS d
      ),
      ev AS (
        SELECT (created_at AT TIME ZONE '${TZ}')::date AS day, actor_type, actor_id
        FROM login_events
        WHERE created_at >= (((now() AT TIME ZONE '${TZ}')::date - (CAST(:days AS integer) - 1))::timestamp AT TIME ZONE '${TZ}')
      )
      SELECT to_char(days.day, 'YYYY-MM-DD') AS date,
        COUNT(ev.actor_id) FILTER (WHERE ev.actor_type = 'vendor') AS vendor,
        COUNT(ev.actor_id) FILTER (WHERE ev.actor_type = 'team_member') AS team_member,
        COUNT(ev.actor_id) FILTER (WHERE ev.actor_type = 'visitor') AS visitor,
        COUNT(ev.actor_id) FILTER (WHERE ev.actor_type = 'super_admin') AS super_admin,
        COUNT(ev.actor_id) AS total,
        COUNT(DISTINCT ev.actor_id) AS unique_users
      FROM days LEFT JOIN ev ON ev.day = days.day
      GROUP BY days.day ORDER BY days.day ASC`,
      { days }
    ),
    run(
      `SELECT actor_type, COUNT(*) AS logins, COUNT(DISTINCT actor_id) AS unique_users
       FROM login_events
       WHERE created_at >= now() - (CAST(:days AS integer) * interval '1 day')
       GROUP BY actor_type`,
      { days }
    ),
    run(`
      SELECT le.id, le.actor_type, le.created_at,
             COALESCE(u.name, tm.name, pu.name) AS name,
             COALESCE(u.email, tm.email, pu.email) AS email,
             v.hall_name
      FROM login_events le
      LEFT JOIN users u ON le.actor_type IN ('super_admin', 'vendor') AND u.id = le.actor_id
      LEFT JOIN team_members tm ON le.actor_type = 'team_member' AND tm.id = le.actor_id
      LEFT JOIN public_users pu ON le.actor_type = 'visitor' AND pu.id = le.actor_id
      LEFT JOIN venues v ON v.id = le.venue_id
      ORDER BY le.created_at DESC
      LIMIT 15`),
    run(
      `SELECT u.id, u.name, u.email, COUNT(*) AS logins, MAX(le.created_at) AS last_login,
              (SELECT v.hall_name FROM venues v WHERE v.owner_id = u.id ORDER BY v.created_at ASC LIMIT 1) AS hall_name
       FROM login_events le
       JOIN users u ON u.id = le.actor_id
       WHERE le.actor_type = 'vendor' AND le.created_at >= now() - (CAST(:days AS integer) * interval '1 day')
       GROUP BY u.id
       ORDER BY logins DESC, last_login DESC
       LIMIT 8`,
      { days }
    ),
    run(`
      SELECT v.id, v.hall_name, v.city, p.name AS plan_name, s.locked_price, s.billing_cycle,
             s.current_period_end, u.last_login_at
      FROM venues v
      JOIN (${LATEST_SUBS}) s ON s.venue_id = v.id
      JOIN plans p ON p.id = s.plan_id
      LEFT JOIN users u ON u.id = v.owner_id
      WHERE v.is_active = true AND ${IS_PAYING}
        AND (u.last_login_at IS NULL OR u.last_login_at < now() - interval '14 days')
      ORDER BY u.last_login_at ASC NULLS FIRST
      LIMIT 10`),
    one(`SELECT COUNT(*) AS total, MIN(created_at) AS tracking_since FROM login_events`)
  ]);

  return {
    days,
    tracking_since: overall.tracking_since || null,
    total_recorded: num(overall.total),
    series: series.map((r) =>
      numberize(r, ["vendor", "team_member", "visitor", "super_admin", "total", "unique_users"])
    ),
    by_type: byType.map((r) => numberize(r, ["logins", "unique_users"])),
    recent,
    top_vendors: topVendors.map((r) => numberize(r, ["logins"])),
    at_risk: atRisk.map((r) => ({ ...r, locked_price: num(r.locked_price) }))
  };
}

// ───────────────────────────── PLAN-WISE VENDORS ─────────────────────────────

async function getPlans() {
  const [rows, noSub] = await Promise.all([
    run(`
      SELECT p.id, p.name, p.monthly_price, p.yearly_price, p.is_active, p.trial_days, p.features,
        COUNT(s.id) AS vendors,
        COUNT(s.id) FILTER (WHERE s.status = 'trial') AS trial,
        COUNT(s.id) FILTER (WHERE s.status = 'active') AS active,
        COUNT(s.id) FILTER (WHERE s.status = 'expiring_soon') AS expiring_soon,
        COUNT(s.id) FILTER (WHERE s.status = 'expired') AS expired,
        COUNT(s.id) FILTER (WHERE s.status = 'suspended') AS suspended,
        COUNT(s.id) FILTER (WHERE v.marketplace_listed = true AND v.is_active = true) AS listed,
        COALESCE(SUM(CASE WHEN ${IS_PAYING} THEN ${MONTHLY_VALUE} END), 0) AS mrr
      FROM plans p
      LEFT JOIN (${LATEST_SUBS}) s ON s.plan_id = p.id
      LEFT JOIN venues v ON v.id = s.venue_id
      GROUP BY p.id
      ORDER BY p.monthly_price ASC, p.name ASC`),
    one(`SELECT COUNT(*) AS n FROM venues v WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.venue_id = v.id)`)
  ]);

  const plans = rows.map((r) => ({
    id: r.id,
    name: r.name,
    monthly_price: num(r.monthly_price),
    yearly_price: r.yearly_price === null ? null : num(r.yearly_price),
    is_active: r.is_active,
    trial_days: num(r.trial_days),
    features: Array.isArray(r.features) ? r.features : [],
    vendors: num(r.vendors),
    trial: num(r.trial),
    active: num(r.active),
    expiring_soon: num(r.expiring_soon),
    expired: num(r.expired),
    suspended: num(r.suspended),
    listed: num(r.listed),
    mrr: Math.round(num(r.mrr))
  }));

  // How many vendors can use each feature RIGHT NOW (live subscription + plan includes the feature).
  const featureAdoption = PLAN_FEATURES.map(({ key, label }) => {
    const vendors = plans
      .filter((p) => p.features.includes(key))
      .reduce((sum, p) => sum + p.trial + p.active + p.expiring_soon, 0);
    return { key, label, vendors };
  });

  const totalVendors = plans.reduce((sum, p) => sum + p.vendors, 0) + num(noSub.n);

  return {
    plans,
    feature_adoption: featureAdoption,
    no_subscription: num(noSub.n),
    total_vendors: totalVendors,
    total_mrr: plans.reduce((sum, p) => sum + p.mrr, 0)
  };
}

// ───────────────────────────── MARKETPLACE ─────────────────────────────

async function getMarketplace() {
  const [funnel, freeListings, topFreeListings, oldestPending, byCategory, byCity, health, access, reviews, cityDemand] =
    await Promise.all([
      one(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE role = 'venue_owner') AS signed_up,
          (SELECT COUNT(DISTINCT owner_id) FROM venues) AS created_business,
          (SELECT COUNT(*) FROM venues WHERE marketplace_profile_complete = true) AS profile_complete,
          (SELECT COUNT(*) FROM venues WHERE marketplace_listed = true AND is_active = true) AS listed,
          (SELECT COUNT(*) FROM (${LATEST_SUBS}) s
             JOIN venues v ON v.id = s.venue_id WHERE ${IS_PAYING}) AS paying
      `),
      one(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'pending') AS pending,
          COUNT(*) FILTER (WHERE status = 'active') AS active,
          COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
          COALESCE(SUM(profile_views), 0) AS views,
          COALESCE(SUM(inquiry_count), 0) AS inquiries
        FROM vendor_listings
      `),
      run(`
        SELECT id, business_name, profile_views, inquiry_count
        FROM vendor_listings WHERE status = 'active'
        ORDER BY profile_views DESC, id ASC LIMIT 5`),
      one(`SELECT MIN(created_at) AS oldest FROM vendor_listings WHERE status = 'pending'`),
      run(`
        SELECT COALESCE(c.name, v.business_category) AS label, COUNT(*) AS count
        FROM venues v LEFT JOIN categories c ON c.slug = v.business_category
        WHERE v.marketplace_listed = true AND v.is_active = true AND v.business_category IS NOT NULL
        GROUP BY COALESCE(c.name, v.business_category)
        ORDER BY count DESC, label ASC LIMIT 10`),
      run(`
        SELECT MIN(TRIM(v.city)) AS label, COUNT(*) AS count
        FROM venues v
        WHERE v.marketplace_listed = true AND v.is_active = true AND v.city IS NOT NULL AND TRIM(v.city) <> ''
        GROUP BY LOWER(TRIM(v.city))
        ORDER BY count DESC, label ASC LIMIT 10`),
      one(`
        SELECT
          (SELECT COUNT(*) FROM venues v WHERE v.marketplace_listed = true AND v.is_active = true
             AND EXISTS (SELECT 1 FROM inquiries i WHERE i.venue_id = v.id
                           AND i.created_at >= now() - interval '30 days')) AS listed_with_inquiry_30d,
          (SELECT COUNT(*) FROM venues v WHERE v.marketplace_listed = true AND v.is_active = true
             AND NOT EXISTS (SELECT 1 FROM inquiries i WHERE i.venue_id = v.id)) AS listed_never_inquired,
          (SELECT COUNT(*) FROM inquiries WHERE source = 'marketplace'
             AND created_at >= now() - interval '30 days') AS marketplace_inquiries_30d,
          (SELECT COUNT(*) FROM inquiries WHERE source = 'subdomain'
             AND created_at >= now() - interval '30 days') AS subdomain_inquiries_30d
      `),
      // What listed vendors can actually offer visitors under their CURRENT plan.
      one(`
        SELECT
          COUNT(*) AS listed,
          COUNT(*) FILTER (WHERE COALESCE(s.status IN ('trial', 'active', 'expiring_soon')
                             AND jsonb_exists(p.features, 'inquiries'), false)) AS can_inquire,
          COUNT(*) FILTER (WHERE COALESCE(s.status IN ('trial', 'active', 'expiring_soon')
                             AND jsonb_exists(p.features, 'slots'), false)) AS can_show_calendar,
          COUNT(*) FILTER (WHERE COALESCE(s.status IN ('trial', 'active', 'expiring_soon')
                             AND jsonb_exists(p.features, 'reviews'), false)) AS can_show_reviews
        FROM venues v
        LEFT JOIN (${LATEST_SUBS}) s ON s.venue_id = v.id
        LEFT JOIN plans p ON p.id = s.plan_id
        WHERE v.marketplace_listed = true AND v.is_active = true
      `),
      one(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending') AS pending,
          COUNT(*) FILTER (WHERE status = 'approved') AS approved,
          COUNT(*) FILTER (WHERE status = 'rejected') AS rejected
        FROM reviews
      `),
      run(`
        SELECT MIN(city) AS city, COUNT(*) AS count
        FROM city_requests WHERE status = 'pending'
        GROUP BY city_key ORDER BY count DESC, city ASC LIMIT 5`)
    ]);

  const f = numberize(funnel, ["signed_up", "created_business", "profile_complete", "listed", "paying"]);
  const h = numberize(health, [
    "listed_with_inquiry_30d", "listed_never_inquired", "marketplace_inquiries_30d", "subdomain_inquiries_30d"
  ]);
  const a = numberize(access, ["listed", "can_inquire", "can_show_calendar", "can_show_reviews"]);

  return {
    funnel: [
      { label: "Signed up", count: f.signed_up },
      { label: "Created business", count: f.created_business },
      { label: "Profile complete", count: f.profile_complete },
      { label: "Listed on marketplace", count: f.listed },
      { label: "Paying subscribers", count: f.paying }
    ],
    free_listings: {
      ...numberize(freeListings, ["total", "pending", "active", "rejected", "views", "inquiries"]),
      oldest_pending_at: oldestPending.oldest || null,
      top: topFreeListings.map((r) => numberize(r, ["profile_views", "inquiry_count"]))
    },
    listed_by_category: byCategory.map((r) => numberize(r, ["count"])),
    listed_by_city: byCity.map((r) => numberize(r, ["count"])),
    demand: {
      ...h,
      active_vendor_pct: pct(h.listed_with_inquiry_30d, a.listed)
    },
    plan_access: {
      ...a,
      cannot_inquire: a.listed - a.can_inquire,
      cannot_show_calendar: a.listed - a.can_show_calendar,
      cannot_show_reviews: a.listed - a.can_show_reviews
    },
    reviews: numberize(reviews, ["pending", "approved", "rejected"]),
    city_demand: cityDemand.map((r) => numberize(r, ["count"]))
  };
}

// ───────────────────────────── DATABASE & SYSTEM ─────────────────────────────

// Fixed whitelist - these names are interpolated into SQL, so they must never come from the request.
const TABLES = [
  { name: "users", label: "Accounts (owners + admin)", group: "People" },
  { name: "venues", label: "Vendors / businesses", group: "People" },
  { name: "team_members", label: "Team members", group: "People" },
  { name: "public_users", label: "Visitor accounts", group: "People" },
  { name: "login_events", label: "Login events", group: "People" },
  { name: "plans", label: "Plans", group: "Billing" },
  { name: "subscriptions", label: "Subscriptions", group: "Billing" },
  { name: "payments", label: "Payments", group: "Billing" },
  { name: "referrals", label: "Referrals", group: "Billing" },
  { name: "referral_credit_ledger", label: "Referral credit ledger", group: "Billing" },
  { name: "inquiries", label: "Inquiries", group: "Vendor activity" },
  { name: "bookings", label: "Bookings", group: "Vendor activity" },
  { name: "clients", label: "Vendor clients", group: "Vendor activity" },
  { name: "invoices", label: "Invoices & quotations", group: "Vendor activity" },
  { name: "slots", label: "Slots", group: "Vendor activity" },
  { name: "packages", label: "Packages", group: "Vendor activity" },
  { name: "vendor_listings", label: "Free listings", group: "Marketplace" },
  { name: "reviews", label: "Reviews", group: "Marketplace" },
  { name: "saved_vendors", label: "Saved vendors", group: "Marketplace" },
  { name: "cities", label: "Cities", group: "Marketplace" },
  { name: "categories", label: "Categories", group: "Marketplace" },
  { name: "city_requests", label: "City requests", group: "Marketplace" },
  { name: "announcements", label: "Announcements", group: "Marketplace" },
  { name: "whatsapp_messages", label: "WhatsApp messages", group: "Messaging" }
];

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

async function getRedisStatus() {
  if (!process.env.REDIS_URL) return { configured: false, connected: false };
  try {
    const client = await withTimeout(getRedisClient(), 2000);
    if (!client) return { configured: true, connected: false };
    await withTimeout(client.ping(), 1500);
    return { configured: true, connected: true };
  } catch (err) {
    return { configured: true, connected: false };
  }
}

async function countTable(table, hasCreatedAt) {
  const ident = `"public"."${table.name}"`;
  try {
    const row = await one(`
      SELECT COUNT(*) AS total,
             ${hasCreatedAt ? `COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')` : "NULL"} AS last_7d,
             pg_total_relation_size('${ident}'::regclass) AS size_bytes
      FROM ${ident}`);
    return {
      ...table,
      exists: true,
      total: num(row.total),
      last_7d: hasCreatedAt ? num(row.last_7d) : null,
      size_bytes: num(row.size_bytes)
    };
  } catch (err) {
    return { ...table, exists: false, total: 0, last_7d: null, size_bytes: 0 };
  }
}

function getPoolStats() {
  try {
    const pool = sequelize.connectionManager.pool;
    return { size: pool.size, in_use: pool.using, idle: pool.available, waiting: pool.waiting, max: pool.maxSize };
  } catch (_) {
    return null;
  }
}

// Plain-language warnings shown at the top of the system page.
function buildAlerts({ backups, requests, server, host, database }) {
  const alerts = [];
  const add = (level, text) => alerts.push({ level, text });

  const last = backups.last_success;
  if (!last) {
    add("critical", "No successful database backup exists yet. Use \"Back up now\" and check the result.");
  } else {
    const ageHours = (Date.now() - new Date(last.at).getTime()) / 3600000;
    if (ageHours > 36) add("critical", `The last successful backup is ${Math.round(ageHours)} hours old. Automatic backup may be failing.`);
  }
  if (backups.last_attempt && !backups.last_attempt.ok) {
    add("critical", `The latest backup attempt failed: ${backups.last_attempt.error || "unknown error"}`);
  }
  if (last && !last.uploaded) {
    add("warning", "The newest backup is only on this server. Set R2_BACKUP_BUCKET_NAME so a copy is kept outside the server too.");
  }
  if (backups.disk && backups.disk.used_percent >= 85) {
    add("warning", `Server disk is ${backups.disk.used_percent}% full.`);
  }
  if (database.connections && database.connections.max && database.connections.used / database.connections.max >= 0.8) {
    add("warning", `Database connections are almost full (${database.connections.used} of ${database.connections.max}).`);
  }
  if (server.memory_rss_mb >= 400) {
    add("warning", `The app is using ${server.memory_rss_mb} MB of memory. PM2 restarts it at 500 MB.`);
  }
  if (host.memory_used_percent >= 90) {
    add("warning", `Server memory is ${host.memory_used_percent}% used.`);
  }
  if (requests.last_5m.errors_5xx >= 5) {
    add("critical", `${requests.last_5m.errors_5xx} server errors in the last 5 minutes. See the error list below.`);
  }
  if (requests.last_5m.rate_limited > 0) {
    add("warning", `${requests.last_5m.rate_limited} requests were blocked by the rate limit in the last 5 minutes.`);
  }
  if (requests.event_loop.p99_ms >= 200) {
    add("warning", `The server is responding slowly (delay up to ${requests.event_loop.p99_ms} ms).`);
  }
  if (requests.process_errors.uncaught_exceptions > 0) {
    add("critical", "The app restarted after an uncaught error. Check the PM2 error log.");
  }
  return alerts;
}

async function getSystem() {
  const started = Date.now();
  const [dbInfo, meta, redis] = await Promise.all([
    one(`SELECT pg_database_size(current_database()) AS size_bytes, current_database() AS name, version() AS version`),
    run(`
      SELECT t.table_name,
             EXISTS (SELECT 1 FROM information_schema.columns c
                     WHERE c.table_schema = 'public' AND c.table_name = t.table_name
                       AND c.column_name = 'created_at') AS has_created_at
      FROM information_schema.tables t
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'`),
    getRedisStatus()
  ]);
  const dbLatencyMs = Date.now() - started;

  const present = new Map(meta.map((m) => [m.table_name, m.has_created_at]));
  const tables = await Promise.all(
    TABLES.map((t) => (present.has(t.name) ? countTable(t, present.get(t.name)) : { ...t, exists: false, total: 0, last_7d: null, size_bytes: 0 }))
  );

  // Extra health numbers. Each one is optional: if a query is not allowed it is simply left out.
  const [conn, cache] = await Promise.all([
    one(`SELECT (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) AS used,
                current_setting('max_connections')::int AS max`).catch(() => null),
    one(`SELECT round(100.0 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0), 1) AS ratio
         FROM pg_stat_database WHERE datname = current_database()`).catch(() => null)
  ]);

  const mem = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const requests = metrics.snapshot();
  const backups = await backup.getBackupStatus();

  const database = {
    name: dbInfo.name,
    version: String(dbInfo.version || "").split(" on ")[0],
    size_bytes: num(dbInfo.size_bytes),
    latency_ms: dbLatencyMs,
    total_rows: tables.reduce((sum, t) => sum + t.total, 0),
    connections: conn ? { used: num(conn.used), max: num(conn.max) } : null,
    pool: getPoolStats(),
    cache_hit_percent: cache && cache.ratio !== null && cache.ratio !== undefined ? Number(cache.ratio) : null
  };

  const server = {
    node_version: process.version,
    environment: process.env.NODE_ENV || "development",
    uptime_seconds: Math.round(process.uptime()),
    memory_rss_mb: Math.round(mem.rss / 1048576),
    memory_heap_mb: Math.round(mem.heapUsed / 1048576)
  };

  const host = {
    cpu_count: os.cpus().length,
    load_average: os.loadavg().map((n) => +n.toFixed(2)),
    memory_total_mb: Math.round(totalMem / 1048576),
    memory_free_mb: Math.round(freeMem / 1048576),
    memory_used_percent: Math.round(((totalMem - freeMem) / totalMem) * 100),
    uptime_seconds: Math.round(os.uptime())
  };

  return {
    database,
    tables,
    redis,
    server,
    host,
    requests,
    backups,
    alerts: buildAlerts({ backups, requests, server, host, database })
  };
}

module.exports = { getSummary, getRegistrations, getLogins, getPlans, getMarketplace, getSystem };