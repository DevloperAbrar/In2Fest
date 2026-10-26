const { monitorEventLoopDelay } = require("perf_hooks");

/**
 * Lightweight in-memory request metrics for the Super Admin "Database & System" page.
 * Everything is bounded (60 one-minute buckets, 300 routes, 25 errors) so it can
 * never grow without limit. Nothing here touches the database or any request data.
 */

const BUCKET_MS = 60 * 1000;
const MAX_BUCKETS = 60;
const MAX_ROUTES = 300;
const MAX_ERRORS = 25;

const loopDelay = monitorEventLoopDelay({ resolution: 20 });
loopDelay.enable();

const buckets = new Map();
const routes = new Map();
const recentErrors = [];
const startedAt = Date.now();

const totals = { requests: 0, errors_5xx: 0, rate_limited: 0 };
const processErrors = { unhandled_rejections: 0, uncaught_exceptions: 0, last: [] };

function bucketFor(ts) {
  const key = Math.floor(ts / BUCKET_MS) * BUCKET_MS;
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { t: key, requests: 0, errors_5xx: 0, errors_4xx: 0, rate_limited: 0, total_ms: 0, max_ms: 0 };
    buckets.set(key, bucket);
    while (buckets.size > MAX_BUCKETS) {
      buckets.delete(buckets.keys().next().value);
    }
  }
  return bucket;
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

function routeKey(req) {
  if (!req.route || typeof req.route.path !== "string") return `${req.method} (unmatched)`;
  const full = `${req.baseUrl || ""}${req.route.path}`
    .replace(UUID_RE, ":id")
    .replace(/\/\d+(?=\/|$)/g, "/:n");
  return `${req.method} ${full}`;
}

function record(req, res, ms) {
  const status = res.statusCode;
  const now = Date.now();
  const bucket = bucketFor(now);

  bucket.requests += 1;
  bucket.total_ms += ms;
  if (ms > bucket.max_ms) bucket.max_ms = ms;
  totals.requests += 1;

  if (status === 429) {
    bucket.rate_limited += 1;
    totals.rate_limited += 1;
  } else if (status >= 500) {
    bucket.errors_5xx += 1;
    totals.errors_5xx += 1;
  } else if (status >= 400) {
    bucket.errors_4xx += 1;
  }

  let key = routeKey(req);
  let stat = routes.get(key);
  if (!stat) {
    if (routes.size >= MAX_ROUTES) key = "(other)";
    stat = routes.get(key);
    if (!stat) {
      stat = { key, count: 0, total_ms: 0, max_ms: 0, errors_5xx: 0 };
      routes.set(key, stat);
    }
  }
  stat.count += 1;
  stat.total_ms += ms;
  if (ms > stat.max_ms) stat.max_ms = ms;
  if (status >= 500) stat.errors_5xx += 1;

  if (status >= 500) {
    recentErrors.unshift({
      at: new Date(now).toISOString(),
      status,
      route: routeKey(req),
      message: String((res.locals && res.locals.errorMessage) || "Server error").slice(0, 200)
    });
    if (recentErrors.length > MAX_ERRORS) recentErrors.length = MAX_ERRORS;
  }
}

function metricsMiddleware(req, res, next) {
  if (req.path === "/health") return next();
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    try {
      record(req, res, Number(process.hrtime.bigint() - start) / 1e6);
    } catch (_) {
      /* metrics must never affect a request */
    }
  });
  next();
}

function recordProcessError(type, err) {
  if (type === "unhandledRejection") processErrors.unhandled_rejections += 1;
  if (type === "uncaughtException") processErrors.uncaught_exceptions += 1;
  processErrors.last.unshift({
    at: new Date().toISOString(),
    type,
    message: String((err && err.message) || err).slice(0, 200)
  });
  if (processErrors.last.length > 10) processErrors.last.length = 10;
}

function sumWindow(minutes) {
  const since = Date.now() - minutes * BUCKET_MS;
  const out = { requests: 0, errors_5xx: 0, errors_4xx: 0, rate_limited: 0, total_ms: 0 };
  buckets.forEach((b) => {
    if (b.t >= since) {
      out.requests += b.requests;
      out.errors_5xx += b.errors_5xx;
      out.errors_4xx += b.errors_4xx;
      out.rate_limited += b.rate_limited;
      out.total_ms += b.total_ms;
    }
  });
  return {
    requests: out.requests,
    errors_5xx: out.errors_5xx,
    errors_4xx: out.errors_4xx,
    rate_limited: out.rate_limited,
    avg_ms: out.requests ? Math.round(out.total_ms / out.requests) : 0
  };
}

function snapshot() {
  const now = Date.now();
  const currentMinute = Math.floor(now / BUCKET_MS) * BUCKET_MS;
  const perMinute = [];
  for (let i = MAX_BUCKETS - 1; i >= 0; i -= 1) {
    const t = currentMinute - i * BUCKET_MS;
    const b = buckets.get(t);
    perMinute.push({
      t,
      requests: b ? b.requests : 0,
      errors_5xx: b ? b.errors_5xx : 0,
      avg_ms: b && b.requests ? Math.round(b.total_ms / b.requests) : 0
    });
  }

  const routeList = [...routes.values()].map((r) => ({
    route: r.key,
    count: r.count,
    avg_ms: Math.round(r.total_ms / r.count),
    max_ms: Math.round(r.max_ms),
    errors_5xx: r.errors_5xx
  }));

  const slowest = routeList.filter((r) => r.count >= 3).sort((a, b) => b.avg_ms - a.avg_ms).slice(0, 8);
  const busiest = routeList.sort((a, b) => b.count - a.count).slice(0, 8);

  const loop = {
    mean_ms: +(loopDelay.mean / 1e6).toFixed(1) || 0,
    p99_ms: +(loopDelay.percentile(99) / 1e6).toFixed(1) || 0,
    max_ms: +(loopDelay.max / 1e6).toFixed(1) || 0
  };
  loopDelay.reset();

  return {
    since: new Date(startedAt).toISOString(),
    totals: { ...totals },
    last_5m: sumWindow(5),
    last_60m: sumWindow(60),
    per_minute: perMinute,
    slowest_routes: slowest,
    busiest_routes: busiest,
    recent_errors: recentErrors.slice(0, 10),
    event_loop: loop,
    process_errors: processErrors
  };
}

module.exports = { metricsMiddleware, recordProcessError, snapshot };