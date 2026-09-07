const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const env = require("../../config/env");
const { User } = require("../../database/models");

passport.use(
  new GoogleStrategy(
    {
      clientID: env.google.clientId,
      clientSecret: env.google.clientSecret,
      callbackURL: env.google.callbackUrl
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ where: { google_id: profile.id } });

        if (!user) {
          // check if an account already exists with this email (edge case)
          user = await User.findOne({ where: { email: profile.emails[0].value } });
        }

        if (!user) {
          user = await User.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            google_id: profile.id,
            role: "venue_owner"
          });
        } else if (!user.google_id) {
          user.google_id = profile.id;
          await user.save();
        }

        if (!user.is_active) {
          return done(null, false, { message: "Account is deactivated" });
        }

        if (user.role === "venue_owner") {
          const Venue = User.sequelize.models.Venue;
          const totalVenues = await Venue.count({ where: { owner_id: user.id } });
          if (totalVenues > 0) {
            const activeVenue = await Venue.findOne({ where: { owner_id: user.id, is_active: true } });
            if (!activeVenue) {
              return done(null, false, { message: "Your venue has been deactivated" });
            }
          }
          // totalVenues === 0 → brand-new owner who hasn't onboarded yet, let them through
        }

        user.last_login_at = new Date();
        await user.save();

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;