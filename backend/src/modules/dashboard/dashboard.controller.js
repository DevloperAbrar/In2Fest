const { Op, fn, col } = require("sequelize");
const dayjs = require("dayjs");
const {
  Venue,
  Subscription,
  Plan,
  Payment,
  Booking,
  Inquiry,
  Client,
  Review,
  WhatsappMessage,
  VendorListing,
  Slot
} = require("../../database/models");

function emptyWhatsappStats() {
  return { scheduled: 0, sent: 0, delivered: 0, failed: 0 };
}

// ==================== VENUE OWNER ====================

async function getOwnerSummary(req, res, next) {
  try {
    const venueId = req.params.venueId;
    const todayStr = dayjs().format("YYYY-MM-DD");

    const [
      newInquiriesCount,
      todaysBookingsCount,
      upcomingBookingsRaw,
      recentInquiries,
      pendingReviewsCount,
      unrepliedReviews,
      whatsappRows
    ] = await Promise.all([
      Inquiry.count({ where: { venue_id: venueId, status: "new" } }),
      Booking.count({ where: { venue_id: venueId, event_date: todayStr, status: { [Op.ne]: "cancelled" } } }),
      Booking.findAll({
        where: {
          venue_id: venueId,
          event_date: { [Op.gte]: todayStr },
          status: { [Op.ne]: "cancelled" }
        },
        include: [
          { model: Client, as: "client", attributes: ["name", "phone"] },
          { model: Slot, as: "slot", attributes: ["name"] }
        ],
        order: [["event_date", "ASC"]],
        limit: 5
      }),
      Inquiry.findAll({
        where: { venue_id: venueId },
        order: [["created_at", "DESC"]],
        limit: 5
      }),
      Review.count({ where: { venue_id: venueId, status: "pending" } }),
      Review.findAll({
        where: { venue_id: venueId, status: "approved", owner_reply: null },
        order: [["created_at", "DESC"]],
        limit: 5
      }),
      WhatsappMessage.findAll({
        where: { venue_id: venueId, created_at: { [Op.gte]: dayjs().subtract(30, "day").toDate() } },
        attributes: ["status", [fn("COUNT", col("id")), "count"]],
        group: ["status"],
        raw: true
      })
    ]);

    const upcomingBookings = upcomingBookingsRaw.map((b) => ({
      id: b.id,
      eventDate: b.event_date,
      eventType: b.event_type,
      slotName: b.slot?.name || null,
      clientName: b.client?.name || " -",
      clientPhone: b.client?.phone || " -",
      status: b.status,
      totalAmount: +b.total_amount || 0,
      balancePending: +b.balance_pending || 0
    }));

    const whatsappStats = emptyWhatsappStats();
    whatsappRows.forEach((r) => { whatsappStats[r.status] = +r.count; });

    res.json({
      success: true,
      data: {
        newInquiriesCount,
        todaysBookingsCount,
        upcomingBookings,
        recentInquiries,
        pendingReviewsCount,
        unrepliedReviews,
        whatsappStats
      }
    });
  } catch (error) {
    next(error);
  }
}

// ==================== SUPER ADMIN ====================

async function getAdminSummary(req, res, next) {
  try {
    const [
      recentSignups,
      expiringSubscriptionsRaw,
      pendingReviewModerationCount,
      pendingFreeListingsCount,
      recentPaymentsRaw,
      whatsappRows
    ] = await Promise.all([
      Venue.findAll({
        order: [["created_at", "DESC"]],
        limit: 6,
        attributes: ["id", "hall_name", "city", "subdomain", "created_at", "is_active"]
      }),
      Subscription.findAll({
        where: { status: { [Op.in]: ["expiring_soon", "trial"] } },
        include: [
          { model: Venue, attributes: ["id", "hall_name", "city"] },
          { model: Plan, as: "plan", attributes: ["name"] }
        ],
        order: [["current_period_end", "ASC"]],
        limit: 6
      }),
      Review.count({ where: { status: "pending" } }),
      VendorListing.count({ where: { status: "pending" } }),
      Payment.findAll({
        where: { status: "success" },
        include: [{ model: Venue, attributes: ["hall_name"] }],
        order: [["created_at", "DESC"]],
        limit: 6
      }),
      WhatsappMessage.findAll({
        where: { created_at: { [Op.gte]: dayjs().subtract(30, "day").toDate() } },
        attributes: ["status", [fn("COUNT", col("id")), "count"]],
        group: ["status"],
        raw: true
      })
    ]);

    const expiringSubscriptions = expiringSubscriptionsRaw.map((s) => ({
      id: s.id,
      venueId: s.venue_id,
      hallName: s.Venue?.hall_name || "Unknown venue",
      city: s.Venue?.city || "-",
      planName: s.plan?.name || "-",
      status: s.status,
      currentPeriodEnd: s.current_period_end,
      trialEndsAt: s.trial_ends_at
    }));

    const recentPayments = recentPaymentsRaw.map((p) => ({
      id: p.id,
      hallName: p.Venue?.hall_name || "Unknown venue",
      amount: +p.amount || 0,
      method: p.method,
      createdAt: p.created_at
    }));

    const whatsappStats = emptyWhatsappStats();
    whatsappRows.forEach((r) => { whatsappStats[r.status] = +r.count; });

    res.json({
      success: true,
      data: {
        recentSignups,
        expiringSubscriptions,
        pendingReviewModerationCount,
        pendingFreeListingsCount,
        recentPayments,
        whatsappStats
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOwnerSummary,
  getAdminSummary
};