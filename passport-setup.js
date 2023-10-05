const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20");
const GitHubStrategy = require("passport-github").Strategy;
const LocalStrategy = require("passport-local").Strategy;
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const winston = require("winston");
const logger = require("./middleware/logger");

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  // Fetch user from database using the id
  await User.findById(id).then((user) => {
    done(null, user);
  });
});

// Local Strategy
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      const bodyEmail = JSON.parse(JSON.stringify(req.body.email));
      const bodyPassword = JSON.parse(JSON.stringify(req.body.password));

      if (!bodyEmail) {
        return done(null, false, { message: "No email provided" });
      }
      const user = await User?.findByEmail(bodyEmail);
      try {
        if (!user) {
          return done(null, false, { message: "No user with that email" });
        } else {
          const userWithMethods = new User(
            user.id,
            user.username,
            user.email,
            user.password,
            user.googleId,
            user.githubId
          );
          const userIsValid = await userWithMethods?.validatePassword(
            bodyPassword
          );
          if (!userIsValid) {
            return done(null, false, { message: "Incorrect password" });
          }
          return done(null, user);
        }
      } catch (error) {
        console.log("Error during authentication:", error);
        return done(error);
      }
    }
  )
);

// Google Strategy
// passport.use(
//   new GoogleStrategy(
//     {
//       clientID: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       callbackURL: "http://localhost:3000/auth/google/callback",
//     },
//     function (accessToken, refreshToken, profile, done) {
//       // You can find or create user in your database here
//       User.findOrCreate({ googleId: profile.id }, function (err, user) {
//         return done(err, user);
//       });
//     }
//   )
// );

// // GitHub Strategy
// passport.use(
//   new GitHubStrategy(
//     {
//       clientID: process.env.GITHUB_CLIENT_ID,
//       clientSecret: process.env.GITHUB_CLIENT_SECRET,
//       callbackURL: "http://localhost:3000/auth/github/callback",
//     },
//     function (accessToken, refreshToken, profile, done) {
//       // You can find or create user in your database here
//       User.findOrCreate({ githubId: profile.id }, function (err, user) {
//         return done(err, user);
//       });
//     }
//   )
// );
