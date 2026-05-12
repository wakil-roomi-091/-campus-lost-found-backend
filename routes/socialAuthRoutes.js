// server/routes/socialAuthRoutes.js
const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const router = express.Router();

console.log("🔵 Loading socialAuthRoutes...");
console.log("🔵 JWT_SECRET length:", process.env.JWT_SECRET?.length);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("📧 Google Profile:", profile.emails[0].value);

        let user = await User.findOne({ email: profile.emails[0].value });

        if (!user) {
          user = new User({
            name: profile.displayName,
            email: profile.emails[0].value,
            password: Math.random().toString(36).slice(-16),
            isEmailVerified: true,
            profilePicture: profile.photos[0]?.value || "",
            authProvider: "google",
            googleId: profile.id,
            role: "user", // Explicitly set role
          });
          await user.save();
          console.log("✅ New user created with role:", user.role);
        } else {
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
          console.log("✅ Existing user logged in. Role:", user.role);
        }

        return done(null, user);
      } catch (err) {
        console.error("❌ Error:", err);
        return done(err, null);
      }
    },
  ),
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Google Login Route
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  }),
);

// Google Callback Route
router.get("/google/callback", (req, res, next) => {
  console.log("🔵 Callback received!");

  passport.authenticate("google", { session: false }, (err, user, info) => {
    console.log("🔵 Passport callback:", {
      hasError: !!err,
      hasUser: !!user,
      userRole: user?.role,
    });

    if (err || !user) {
      console.error("❌ Auth failed:", err?.message || info);
      return res.redirect(
        "https://campus-lost-found-frontend-xeac.vercel.app/login?error=auth_failed",
      );
    }

    try {
      // Create token with user ID and role
      const payload = { id: user._id.toString(), role: user.role };
      console.log("🔵 Token payload:", payload);

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      console.log("✅ Token generated successfully");

      const redirectUrl = `https://campus-lost-found-frontend-xeac.vercel.app/auth/callback?token=${token}&userId=${user._id}&name=${encodeURIComponent(user.name)}&email=${user.email}&role=${user.role}`;
      console.log("🔄 Redirecting to frontend");
      res.redirect(redirectUrl);
    } catch (err) {
      console.error("❌ Token error:", err);
      res.redirect(
        "https://campus-lost-found-frontend-xeac.vercel.app/login?error=token_failed",
      );
    }
  })(req, res, next);
});

module.exports = router;
