const { sequelize } = require("../../config/database");
const { DataTypes } = require("sequelize");

const User = require("./user.model")(sequelize, DataTypes);
const Venue = require("./venue.model")(sequelize, DataTypes);
const Plan = require("./plan.model")(sequelize, DataTypes);
const Subscription = require("./subscription.model")(sequelize, DataTypes);
const Payment = require("./payment.model")(sequelize, DataTypes);
const Slot = require("./slot.model")(sequelize, DataTypes);
const Inquiry = require("./inquiry.model")(sequelize, DataTypes);
const Booking = require("./booking.model")(sequelize, DataTypes);
const Client = require("./client.model")(sequelize, DataTypes);
const PaymentLedger = require("./paymentLedger.model")(sequelize, DataTypes);
const Invoice = require("./invoice.model")(sequelize, DataTypes);
const ServiceItem = require("./serviceItem.model")(sequelize, DataTypes);
const WhatsappTemplate = require("./whatsappTemplate.model")(sequelize, DataTypes);
const WhatsappMessage = require("./whatsappMessage.model")(sequelize, DataTypes);
const TeamMember = require("./teamMember.model")(sequelize, DataTypes);

const City = require("./city.model")(sequelize, DataTypes);
const Category = require("./category.model")(sequelize, DataTypes);
const VenueServiceArea = require("./venueServiceArea.model")(sequelize, DataTypes);

const VendorListing = require("./vendorListing.model")(sequelize, DataTypes);

const Review = require("./review.model")(sequelize, DataTypes);
const ReviewRequest = require("./reviewRequest.model")(sequelize, DataTypes);

const PublicUser = require("./publicUser.model")(sequelize, DataTypes);

// ---- Associations ----

// A User (owner) can own multiple Venues (multi-hall support, day-one design)
User.hasMany(Venue, { foreignKey: "owner_id", as: "venues" });
Venue.belongsTo(User, { foreignKey: "owner_id", as: "owner" });

Venue.hasOne(Subscription, { foreignKey: "venue_id", as: "subscription" });
Subscription.belongsTo(Venue, { foreignKey: "venue_id" });

Plan.hasMany(Subscription, { foreignKey: "plan_id", as: "subscriptions" });
Subscription.belongsTo(Plan, { foreignKey: "plan_id", as: "plan" });

Venue.hasMany(Payment, { foreignKey: "venue_id", as: "payments" });
Payment.belongsTo(Venue, { foreignKey: "venue_id" });

Venue.hasMany(Slot, { foreignKey: "venue_id", as: "slots" });
Slot.belongsTo(Venue, { foreignKey: "venue_id" });

Venue.hasMany(Inquiry, { foreignKey: "venue_id", as: "inquiries" });
Inquiry.belongsTo(Venue, { foreignKey: "venue_id" });

Venue.hasMany(Client, { foreignKey: "venue_id", as: "clients" });
Client.belongsTo(Venue, { foreignKey: "venue_id" });

Client.belongsTo(Slot, { foreignKey: "slot_id", as: "slot" });

Venue.hasMany(Booking, { foreignKey: "venue_id", as: "bookings" });
Booking.belongsTo(Venue, { foreignKey: "venue_id" });

Client.hasMany(Booking, { foreignKey: "client_id", as: "bookings" });
Booking.belongsTo(Client, { foreignKey: "client_id", as: "client" });

Slot.hasMany(Booking, { foreignKey: "slot_id", as: "bookings" });
Booking.belongsTo(Slot, { foreignKey: "slot_id", as: "slot" });

Inquiry.belongsTo(Slot, { foreignKey: "slot_id", as: "slot" });
Inquiry.hasOne(Booking, { foreignKey: "inquiry_id", as: "booking" });
Booking.belongsTo(Inquiry, { foreignKey: "inquiry_id" });

Booking.hasMany(PaymentLedger, { foreignKey: "booking_id", as: "ledger" });
PaymentLedger.belongsTo(Booking, { foreignKey: "booking_id" });

Booking.hasMany(Invoice, { foreignKey: "booking_id", as: "invoices" });
Invoice.belongsTo(Booking, { foreignKey: "booking_id" });

Client.hasMany(Invoice, { foreignKey: "client_id", as: "invoices" });
Invoice.belongsTo(Client, { foreignKey: "client_id", as: "client" });

Venue.hasMany(Invoice, { foreignKey: "venue_id", as: "invoices" });
Invoice.belongsTo(Venue, { foreignKey: "venue_id" });

Venue.hasMany(ServiceItem, { foreignKey: "venue_id", as: "serviceItems" });
ServiceItem.belongsTo(Venue, { foreignKey: "venue_id" });

Venue.hasMany(TeamMember, { foreignKey: "venue_id", as: "teamMembers" });
TeamMember.belongsTo(Venue, { foreignKey: "venue_id" });

Venue.hasMany(WhatsappMessage, { foreignKey: "venue_id", as: "whatsappMessages" });
WhatsappMessage.belongsTo(Venue, { foreignKey: "venue_id" });

// ---- V2 Marketplace associations ----
Venue.belongsToMany(City, {
  through: VenueServiceArea,
  foreignKey: "venue_id",
  otherKey: "city_id",
  as: "serviceAreas"
});
City.belongsToMany(Venue, {
  through: VenueServiceArea,
  foreignKey: "city_id",
  otherKey: "venue_id",
  as: "venues"
});
VenueServiceArea.belongsTo(Venue, { foreignKey: "venue_id" });
VenueServiceArea.belongsTo(City, { foreignKey: "city_id" });

VendorListing.belongsTo(City, { foreignKey: "city_id", as: "cityRef" });
VendorListing.belongsTo(Category, { foreignKey: "category_id", as: "categoryRef" });

Venue.hasMany(Review, { foreignKey: "venue_id", as: "reviews" });
Review.belongsTo(Venue, { foreignKey: "venue_id" });

VendorListing.hasMany(Review, { foreignKey: "vendor_listing_id", as: "reviews" });
Review.belongsTo(VendorListing, { foreignKey: "vendor_listing_id" });

Booking.hasOne(Review, { foreignKey: "booking_id" });
Review.belongsTo(Booking, { foreignKey: "booking_id" });

Venue.hasMany(ReviewRequest, { foreignKey: "venue_id" });
ReviewRequest.belongsTo(Venue, { foreignKey: "venue_id" });

Booking.hasOne(ReviewRequest, { foreignKey: "booking_id" });
ReviewRequest.belongsTo(Booking, { foreignKey: "booking_id" });

// Public (visitor) reviewer accounts  - NOT a hard FK constraint, since
// reviewer_user_id can also point at a vendor's row in `users` (see review.model.js).
PublicUser.hasMany(Review, { foreignKey: "reviewer_user_id", constraints: false, as: "reviewsGiven" });
Review.belongsTo(PublicUser, { foreignKey: "reviewer_user_id", constraints: false, as: "reviewerAccount" });

module.exports = {
  sequelize,
  User,
  Venue,
  Plan,
  Subscription,
  Payment,
  Slot,
  Inquiry,
  Booking,
  Client,
  PaymentLedger,
  Invoice,
  ServiceItem,
  WhatsappTemplate,
  WhatsappMessage,
  TeamMember,
  City,
  Category,
  VenueServiceArea,
  VendorListing,
  Review,
  ReviewRequest,
  PublicUser,
};