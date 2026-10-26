const service = require("./adminOverview.service");
const backup = require("../../jobs/dbBackup");
const { AppError } = require("../../middleware/error.middleware");

function handler(fn) {
  return async (req, res, next) => {
    try {
      const data = await fn(req.query);
      res.set("Cache-Control", "no-store");
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

// Starts a backup in the background (it can take a few minutes) and answers straight away.
async function runBackupNow(req, res, next) {
  try {
    if (backup.isBackupRunning()) {
      throw new AppError("A backup is already running.", 409);
    }
    console.log(`[ADMIN] Manual backup started by ${req.user.email}`);
    backup.runBackup({ trigger: "manual" }).catch((err) => console.error("[BACKUP] Unexpected error:", err.message));
    res.status(202).json({ success: true, data: { started: true } });
  } catch (error) {
    next(error);
  }
}

// Streams one backup file to the Super Admin (from this server, or from the private R2 bucket).
async function downloadBackup(req, res, next) {
  try {
    const file = await backup.openBackupFile(req.query.file);
    if (!file) throw new AppError("Backup file not found.", 404);

    console.log(`[ADMIN] Backup ${file.name} downloaded by ${req.user.email}`);
    res.set({
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${file.name}"`,
      "Cache-Control": "no-store"
    });
    if (file.size_bytes) res.set("Content-Length", String(file.size_bytes));

    file.stream.on("error", () => res.destroy());
    file.stream.pipe(res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSummary: handler(() => service.getSummary()),
  getRegistrations: handler((query) => service.getRegistrations(query)),
  getLogins: handler((query) => service.getLogins(query)),
  getPlans: handler(() => service.getPlans()),
  getMarketplace: handler(() => service.getMarketplace()),
  getSystem: handler(() => service.getSystem()),
  runBackupNow,
  downloadBackup
};