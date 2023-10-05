const passport = require("passport");
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const { query } = require("../config/db");
const { body, validationResult } = require("express-validator");
const logger = require("../middleware/logger");
const { log } = require("winston");

dotenv.config();

const router = express.Router();

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
      await query(
        "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)",
        [username, email, hashedPassword]
      );
      res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
      next(error);
    }
  }
);

// // User login
// router.post("/login", async (req, res, next) => {
//   const { email, password } = req.body;

//   try {
//     const result = await query("SELECT * FROM users WHERE email = $1", [email]);

//     const user = result.rows[0];
//     if (!user)
//       return res.status(400).json({ message: "Invalid email or password" });

//     const validPassword = await bcrypt.compare(password, user.password);
//     if (!validPassword)
//       return res.status(400).json({ message: "Invalid email or password" });

//     const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
//       expiresIn: "1d",
//     });

//     res.status(200).json({ token });
//   } catch (error) {
//     next(error);
//   }
// });

// Local Login Route
router.post(
  "/login",
  (req, res, next) => {
    next();
  },
  passport.authenticate("local", {
    session: true,
    usernameField: "email",
    passwordField: "password",
  }),
  (req, res) => {
    const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    res.json({ token });
  }
);

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
