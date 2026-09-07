const cron = require("node-cron");
const { WhatsappMessage } = require("../../database/models");
const { whatsappClient } = require("../../config/whatsapp");
const env = require("../../config/env");
const { Op } = require("sequelize");

/**
 * Runs every minute, sends any scheduled messages whose time has arrived.
 */
function startMessageScheduler() {
  cron.schedule("* * * * *", async () => {
    try {
      const dueMessages = await WhatsappMessage.findAll({
        where: {
          status: "scheduled",
          scheduled_for: { [Op.lte]: new Date() }
        }
      });

      for (const msg of dueMessages) {
        try {
          if (env.whatsapp.apiKey) {
            await whatsappClient.post("/send", {
              apiKey: env.whatsapp.apiKey,
              destination: msg.recipient_phone,
              message: msg.body
            });
          }
          msg.status = "delivered";
          msg.sent_at = new Date();
          await msg.save();
        } catch (err) {
          msg.status = "failed";
          await msg.save();
          console.error(`[WHATSAPP SCHEDULER] Failed to send message ${msg.id}:`, err.message);
        }
      }
    } catch (error) {
      console.error("[WHATSAPP SCHEDULER] Error checking scheduled messages:", error.message);
    }
  });

  console.log("[WHATSAPP SCHEDULER] Started (checks every minute).");
}

module.exports = { startMessageScheduler };