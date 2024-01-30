const passport = require("passport");
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const crypto = require("crypto");
const { query } = require("../config/db");
const { body, validationResult } = require("express-validator");
const { authenticate } = require("../middleware/auth");
const { sendVerificationEmail } = require("../utils/sendEmail");

dotenv.config();

const router = express.Router();

const makeToken = (user) => {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

// User registration
router.post(
  "/register",
  [
    body("username").notEmpty().withMessage("Username is required"),
    body("email").notEmpty().withMessage("Email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
      const user = await query(
        "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) returning *",
        [username, email, hashedPassword]
      );

      const token = makeToken(user.rows[0]);
      const verificationToken = crypto.randomBytes(32).toString("hex");

      // Store the verification token
      await query("UPDATE users SET verification_token = $1 WHERE id = $2", [
        verificationToken,
        user.rows[0].id,
      ]);

      // Send verification email
      sendVerificationEmail(user.rows[0].email, verificationToken);

      res.json({ token });
    } catch (error) {
      next(error);
    }
  }
);

// Verification endpoint
router.post("/verify", async (req, res, next) => {
  const { verificationToken } = req.body;
  try {
    const user = await query(
      "SELECT * FROM users WHERE verification_token = $1",
      [verificationToken]
    );

    if (user.rows.length > 0) {
      await query(
        "UPDATE users SET is_active = true, verification_token = null WHERE id = $1",
        [user.rows[0].id]
      );

      res.status(200).json({ message: "Email verified successfully!" });
    } else {
      res
        .status(400)
        .json({ message: "Invalid or expired verification token" });
    }
  } catch (error) {
    next(error);
  }
});

// Forgot Password endpoint
router.post("/forgot", async (req, res, next) => {
  const { forgotToken } = req.body;
  try {
    const user = await query(
      "SELECT * FROM users WHERE verification_token = $1",
      [verificationToken]
    );

    if (user.rows.length > 0) {
      await query(
        "UPDATE users SET is_active = true, verification_token = null WHERE id = $1",
        [user.rows[0].id]
      );

      res.status(200).json({ message: "Email verified successfully!" });
    } else {
      res
        .status(400)
        .json({ message: "Invalid or expired verification token" });
    }
  } catch (error) {
    next(error);
  }
});

// Local Login Route
router.post("/login", passport.authenticate("local"), (req, res) => {
  console.log("hit login route", req.body);
  const token = makeToken(req.user);
  console.log("req.session::", req.session);
  res.cookie("server_token", token, {
    maxAge: 900000,
    httpOnly: false,
    path: "/server",
  });
  res.send({ token });
  // res.json({ token });
});

// User logout
router.post("/logout", authenticate, (req, res) => {
  try {
    // req.logout now requires a callback
    req.logout(function (err) {
      if (err) {
        return next(err);
      }

      // Continue only if logout was successful
      req.session.destroy((err) => {
        // Destroy the session data
        if (err) {
          return res.status(400).json({ message: "Unable to log out" });
        } else {
          return res.status(200).json({ message: "Successfully logged out" });
        }
      });
    });
  } catch (error) {
    console.log("error::", error);
    res.status(500).json({ message: "Internal server error" });
  }

  // client side code => localStorage.removeItem('token');
  /**
   * @todo
   * 1. Remove token from local storage
   * 2. Redirect user to login page
   *
   */
});

// // Google OAuth Route
// router.get(
//   "/google",
//   passport.authenticate("google", {
//     scope: ["profile", "email"],
//   })
// );

// router.get(
//   "/google/callback",
//   passport.authenticate("google", { session: false }),
//   (req, res) => {
//     const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, {
//       expiresIn: "1d",
//     });
//     res.json({ token });
//   }
// );

// // GitHub OAuth Route
// router.get(
//   "/github",
//   passport.authenticate("github", { scope: ["user:email", "gist"] })
// );

// router.get(
//   "/github/callback",
//   passport.authenticate("github", { session: false }, { failureRedirect: "/" }),
//   async (req, res) => {
//     try {
//       // Logic to save GitHub token in user's profile
//       const userId = req.user.id;
//       const githubToken = req.authInfo.accessToken; // Assuming accessToken is stored in authInfo

//       // Updating the user's GitHub token in PostgreSQL database
//       await query("UPDATE users SET github_token = $1 WHERE id = $2", [
//         githubToken,
//         userId,
//       ]);

//       res.redirect("/"); // Redirect user back to your app
//     } catch (err) {
//       console.error(err);
//       res.status(500).send("An error occurred");
//     }
//   }
// );

module.exports = router;
