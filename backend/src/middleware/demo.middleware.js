const { AppError } = require("./error.middleware");
const registry = require("../modules/demo/demo.registry");

// Runs on gym routes. Real owners and real team members pass straight through (no-op).
async function demoContext(req, res, next) {
  try {
    if (!req.user || req.user.role !== "team_member") return next();
    const info = await registry.get(req.user.venueId);
    if (!info) return next();
    if (!registry.isLive(info)) {
      throw new AppError("This demo has ended. Please contact In2Fest to continue.", 403, { code: "ACCOUNT_DEACTIVATED" });
    }
    req.user.isDemo = true;
    registry.touch(req.user.venueId);
    next();
  } catch (e) {
    next(e);
  }
}

// Blocks actions that cost money or touch the outside world (uploads etc.) in demo accounts only.
const blockInDemo = (what = "This action") => (req, res, next) =>
  req.user && req.user.isDemo
    ? next(new AppError(`${what} is disabled in the demo account.`, 403))
    : next();

module.exports = { demoContext, blockInDemo };