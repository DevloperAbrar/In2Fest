const { Op, fn, col, literal } = require("sequelize");
const dayjs = require("dayjs");
const {
  Venue,
  Subscription,
  Payment,
  Booking,
  Inquiry,
  Slot,
  Review,
  Client,
  WhatsappMessage
} = require("../../database/models");

// ==================== SUPER ADMIN ANALYTICS ====================

async function getMrrTrend(req, res, next) {
  try {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = dayjs().subtract(i, "month").startOf("month");
      const monthEnd = dayjs().subtract(i, "month").endOf("month");

      const revenue = await Payment.sum("amount", {
        where: {
          status: "success",
          created_at: { [Op.between]: [monthStart.toDate(), monthEnd.toDate()] }
        }
      });

      months.push({ month: monthStart.format("MMM YYYY"), revenue: revenue || 0 });
    }

    res.json({ success: true, data: months });
  } catch (error) {
    next(error);
  }
}

async function getChurnRate(req, res, next) {
  try {
    const totalActive = await Subscription.count({ where: { status: ["active", "trial", "expiring_soon"] } });
    const expiredThisMonth = await Subscription.count({
      where: {
        status: "expired",
        updated_at: { [Op.gte]: dayjs().startOf("month").toDate() }
      }
    });

    const churnRate = totalActive > 0 ? +((expiredThisMonth / (totalActive + expiredThisMonth)) * 100).toFixed(2) : 0;

    res.json({ success: true, data: { churnRate, totalActive, expiredThisMonth } });
  } catch (error) {
    next(error);
  }
}

async function getDistribution(req, res, next) {
  try {
    const byCity = await Venue.findAll({
      attributes: ["city", [fn("COUNT", col("id")), "count"]],
      group: ["city"]
    });

    const byPlan = await Subscription.findAll({
      attributes: [[col("plan.name"), "planName"], [fn("COUNT", col("Subscription.id")), "count"]],
      include: [{ association: "plan", attributes: [] }],
      group: ["plan.id", "plan.name"]
    });

    res.json({ success: true, data: { byCity, byPlan } });
  } catch (error) {
    next(error);
  }
}

async function getTrialConversion(req, res, next) {
  try {
    const totalTrials = await Subscription.count({
      where: { trial_ends_at: { [Op.ne]: null } }
    });
    const convertedTrials = await Subscription.count({
      where: { trial_ends_at: { [Op.ne]: null }, status: "active" }
    });

    const conversionRate = totalTrials > 0 ? +((convertedTrials / totalTrials) * 100).toFixed(2) : 0;

    res.json({ success: true, data: { totalTrials, convertedTrials, conversionRate } });
  } catch (error) {
    next(error);
  }
}

async function getAdminDashboardStats(req, res, next) {
  try {
    const totalVenues = await Venue.count();
    const activeSubs = await Subscription.count({ where: { status: "active" } });
    const trialSubs = await Subscription.count({ where: { status: "trial" } });
    const expiredSubs = await Subscription.count({ where: { status: "expired" } });
    const suspendedVenues = await Venue.count({ where: { is_active: false } });

    const mrr = await Subscription.sum("locked_price", { where: { status: "active" } });

    const newSignupsThisWeek = await Venue.count({
      where: { created_at: { [Op.gte]: dayjs().subtract(7, "day").toDate() } }
    });

    const expiringSoon = await Subscription.count({ where: { status: "expiring_soon" } });

    res.json({
      success: true,
      data: {
        totalVenues,
        activeSubs,
        trialSubs,
        expiredSubs,
        suspendedVenues,
        mrr: mrr || 0,
        arpu: activeSubs > 0 ? +((mrr || 0) / activeSubs).toFixed(0) : 0,
        newSignupsThisWeek,
        expiringSoon
      }
    });
  } catch (error) {
    next(error);
  }
}

// NEW  - venue signups per month, platform growth trend
async function getSignupTrend(req, res, next) {
  try {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const start = dayjs().subtract(i, "month").startOf("month");
      const end = dayjs().subtract(i, "month").endOf("month");
      const signups = await Venue.count({
        where: { created_at: { [Op.between]: [start.toDate(), end.toDate()] } }
      });
      months.push({ month: start.format("MMM YYYY"), signups });
    }
    res.json({ success: true, data: months });
  } catch (error) {
    next(error);
  }
}

// NEW  - active MRR split by plan
async function getRevenueByPlan(req, res, next) {
  try {
    const rows = await Subscription.findAll({
      where: { status: "active" },
      attributes: [
        [col("plan.name"), "planName"],
        [fn("SUM", col("locked_price")), "revenue"],
        [fn("COUNT", col("Subscription.id")), "count"]
      ],
      include: [{ association: "plan", attributes: [] }],
      group: ["plan.id", "plan.name"],
      raw: true
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

// NEW  - successful payments grouped by method (razorpay / upi_manual / cash_manual / bank_transfer)
async function getPaymentMethodBreakdown(req, res, next) {
  try {
    const rows = await Payment.findAll({
      where: { status: "success" },
      attributes: ["method", [fn("SUM", col("amount")), "total"], [fn("COUNT", col("id")), "count"]],
      group: ["method"],
      raw: true
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

// NEW  - all subscription statuses at once (trial/active/expiring_soon/expired/suspended)
async function getSubscriptionStatusBreakdown(req, res, next) {
  try {
    const rows = await Subscription.findAll({
      attributes: ["status", [fn("COUNT", col("id")), "count"]],
      group: ["status"],
      raw: true
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

// NEW  - leaderboard: top venues by this month's booking revenue
async function getTopVenues(req, res, next) {
  try {
    const start = dayjs().startOf("month").toDate();
    const rows = await Booking.findAll({
      where: { created_at: { [Op.gte]: start } },
      attributes: [
        "venue_id",
        [fn("SUM", col("amount_received")), "revenue"],
        [fn("COUNT", col("Booking.id")), "bookingCount"]
      ],
      group: ["venue_id"],
      order: [[literal('"revenue"'), "DESC"]],
      limit: 8,
      raw: true
    });

    const venueIds = rows.map((r) => r.venue_id);
    const venues = venueIds.length
      ? await Venue.findAll({ where: { id: venueIds }, attributes: ["id", "hall_name", "city"], raw: true })
      : [];
    const venueMap = Object.fromEntries(venues.map((v) => [v.id, v]));

    const data = rows.map((r) => ({
      venueId: r.venue_id,
      hallName: venueMap[r.venue_id]?.hall_name || "Unknown venue",
      city: venueMap[r.venue_id]?.city || "-",
      revenue: +r.revenue || 0,
      bookingCount: +r.bookingCount
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// NEW  - how many venues have GST enabled
async function getGstAdoption(req, res, next) {
  try {
    const total = await Venue.count();
    const gstEnabled = await Venue.count({ where: { gst_enabled: true } });
    res.json({ success: true, data: { gstEnabled, gstDisabled: total - gstEnabled, total } });
  } catch (error) {
    next(error);
  }
}

// ==================== VENUE OWNER ANALYTICS ====================

async function getOwnerAnalytics(req, res, next) {
  try {
    const venueId = req.params.venueId;

    const monthlyBookings = await Booking.count({
      where: {
        venue_id: venueId,
        created_at: { [Op.gte]: dayjs().startOf("month").toDate() }
      }
    });

    const monthlyRevenue = await Booking.sum("amount_received", {
      where: {
        venue_id: venueId,
        created_at: { [Op.gte]: dayjs().startOf("month").toDate() }
      }
    });

    const totalInquiries = await Inquiry.count({ where: { venue_id: venueId } });
    const convertedInquiries = await Inquiry.count({ where: { venue_id: venueId, status: "confirmed" } });

    const totalPendingPayments = await Booking.sum("balance_pending", { where: { venue_id: venueId } });

    // NEW  - lifetime metrics
    const totalRevenueAllTime = await Booking.sum("amount_received", { where: { venue_id: venueId } });
    const totalBookingsAllTime = await Booking.count({ where: { venue_id: venueId } });
    const totalClients = await Client.count({ where: { venue_id: venueId } });
    const avgBookingValue = totalBookingsAllTime > 0
      ? +((totalRevenueAllTime || 0) / totalBookingsAllTime).toFixed(0)
      : 0;

    const reviewAgg = await Review.findOne({
      where: { venue_id: venueId, status: "approved" },
      attributes: [[fn("AVG", col("star_rating")), "avg"], [fn("COUNT", col("id")), "count"]],
      raw: true
    });

    // 6-month revenue trend
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const start = dayjs().subtract(i, "month").startOf("month");
      const end = dayjs().subtract(i, "month").endOf("month");
      const revenue = await Booking.sum("amount_received", {
        where: { venue_id: venueId, created_at: { [Op.between]: [start.toDate(), end.toDate()] } }
      });
      trend.push({ month: start.format("MMM YYYY"), revenue: revenue || 0 });
    }

    res.json({
      success: true,
      data: {
        monthlyBookings,
        monthlyRevenue: monthlyRevenue || 0,
        totalInquiries,
        convertedInquiries,
        conversionRate: totalInquiries > 0 ? +((convertedInquiries / totalInquiries) * 100).toFixed(2) : 0,
        totalPendingPayments: totalPendingPayments || 0,
        revenueTrend: trend,
        totalRevenueAllTime: totalRevenueAllTime || 0,
        totalClients,
        avgBookingValue,
        avgRating: reviewAgg?.avg ? +parseFloat(reviewAgg.avg).toFixed(1) : 0,
        totalReviews: +reviewAgg?.count || 0
      }
    });
  } catch (error) {
    next(error);
  }
}

async function getSlotPopularity(req, res, next) {
  try {
    const venueId = req.params.venueId;

    const popularity = await Booking.findAll({
      where: { venue_id: venueId },
      attributes: [[col("slot.name"), "slotName"], [fn("COUNT", col("Booking.id")), "bookingCount"]],
      include: [{ model: Slot, as: "slot", attributes: [] }],
      group: ["slot.id", "slot.name"]
    });

    res.json({ success: true, data: popularity });
  } catch (error) {
    next(error);
  }
}

// NEW  - inquiry pipeline stage counts, in funnel order
async function getInquiryFunnel(req, res, next) {
  try {
    const venueId = req.params.venueId;
    const statuses = ["new", "contacted", "negotiating", "advance_received", "confirmed", "completed", "cancelled", "lost"];
    const rows = await Inquiry.findAll({
      where: { venue_id: venueId },
      attributes: ["status", [fn("COUNT", col("id")), "count"]],
      group: ["status"],
      raw: true
    });
    const map = Object.fromEntries(rows.map((r) => [r.status, +r.count]));
    const data = statuses.map((s) => ({ label: s, count: map[s] || 0 }));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// NEW  - bookings grouped by status (confirmed / in_progress / completed / cancelled)
async function getBookingStatusBreakdown(req, res, next) {
  try {
    const venueId = req.params.venueId;
    const rows = await Booking.findAll({
      where: { venue_id: venueId },
      attributes: ["status", [fn("COUNT", col("id")), "count"]],
      group: ["status"],
      raw: true
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

// NEW  - revenue split by event type (wedding, birthday, corporate, etc.)
async function getRevenueByEventType(req, res, next) {
  try {
    const venueId = req.params.venueId;
    const rows = await Booking.findAll({
      where: { venue_id: venueId, event_type: { [Op.ne]: null } },
      attributes: [
        "event_type",
        [fn("SUM", col("amount_received")), "revenue"],
        [fn("COUNT", col("id")), "count"]
      ],
      group: ["event_type"],
      order: [[literal('"revenue"'), "DESC"]],
      raw: true
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

// NEW  - where inquiries are coming from: your subdomain site vs the marketplace
async function getInquirySourceBreakdown(req, res, next) {
  try {
    const venueId = req.params.venueId;
    const rows = await Inquiry.findAll({
      where: { venue_id: venueId },
      attributes: ["source", [fn("COUNT", col("id")), "count"]],
      group: ["source"],
      raw: true
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

// NEW  - 6-month collected vs pending payment trend
async function getPaymentCollectionTrend(req, res, next) {
  try {
    const venueId = req.params.venueId;
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const start = dayjs().subtract(i, "month").startOf("month");
      const end = dayjs().subtract(i, "month").endOf("month");
      const received = await Booking.sum("amount_received", {
        where: { venue_id: venueId, created_at: { [Op.between]: [start.toDate(), end.toDate()] } }
      });
      const pending = await Booking.sum("balance_pending", {
        where: { venue_id: venueId, created_at: { [Op.between]: [start.toDate(), end.toDate()] } }
      });
      months.push({ month: start.format("MMM YYYY"), received: received || 0, pending: pending || 0 });
    }
    res.json({ success: true, data: months });
  } catch (error) {
    next(error);
  }
}

// NEW  - star rating distribution + average
async function getReviewStats(req, res, next) {
  try {
    const venueId = req.params.venueId;
    const rows = await Review.findAll({
      where: { venue_id: venueId, status: "approved" },
      attributes: ["star_rating", [fn("COUNT", col("id")), "count"]],
      group: ["star_rating"],
      raw: true
    });
    const distribution = [1, 2, 3, 4, 5].map((star) => {
      const found = rows.find((r) => +r.star_rating === star);
      return { star, count: found ? +found.count : 0 };
    });
    const totalReviews = distribution.reduce((sum, d) => sum + d.count, 0);
    const avgRating = totalReviews > 0
      ? +(distribution.reduce((sum, d) => sum + d.star * d.count, 0) / totalReviews).toFixed(1)
      : 0;
    res.json({ success: true, data: { distribution, totalReviews, avgRating } });
  } catch (error) {
    next(error);
  }
}

// NEW  - top 5 clients by lifetime business value
async function getTopClients(req, res, next) {
  try {
    const venueId = req.params.venueId;
    const clients = await Client.findAll({
      where: { venue_id: venueId },
      order: [["total_business_value", "DESC"]],
      limit: 5,
      attributes: ["id", "name", "phone", "total_business_value", "pending_balance", "event_type"]
    });
    res.json({ success: true, data: clients });
  } catch (error) {
    next(error);
  }
}

// NEW  - which days of the week get booked most (computed in JS to avoid dialect-specific SQL)
async function getBookingsByWeekday(req, res, next) {
  try {
    const venueId = req.params.venueId;
    const bookings = await Booking.findAll({
      where: { venue_id: venueId },
      attributes: ["event_date"],
      raw: true
    });
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = dayNames.map((d) => ({ day: d, count: 0 }));
    bookings.forEach((b) => {
      const idx = dayjs(b.event_date).day();
      counts[idx].count += 1;
    });
    res.json({ success: true, data: counts });
  } catch (error) {
    next(error);
  }
}

// NEW  - WhatsApp delivery stats. Shared by admin (platform-wide) and owner (scoped to venueId).
async function getWhatsappStats(req, res, next) {
  try {
    const { venueId } = req.params;
    const where = venueId ? { venue_id: venueId } : {};
    const rows = await WhatsappMessage.findAll({
      where,
      attributes: ["status", [fn("COUNT", col("id")), "count"]],
      group: ["status"],
      raw: true
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  // super admin
  getMrrTrend,
  getChurnRate,
  getDistribution,
  getTrialConversion,
  getAdminDashboardStats,
  getSignupTrend,
  getRevenueByPlan,
  getPaymentMethodBreakdown,
  getSubscriptionStatusBreakdown,
  getTopVenues,
  getGstAdoption,
  // venue owner
  getOwnerAnalytics,
  getSlotPopularity,
  getInquiryFunnel,
  getBookingStatusBreakdown,
  getRevenueByEventType,
  getInquirySourceBreakdown,
  getPaymentCollectionTrend,
  getReviewStats,
  getTopClients,
  getBookingsByWeekday,
  // shared
  getWhatsappStats
};