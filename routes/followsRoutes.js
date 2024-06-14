const express = require("express");
const { query } = require("../config/db");
const { authenticate } = require("../middleware/auth");
const Follows = require("../models/Follows");

const router = express.Router();

router.post("/add", authenticate, async (req, res, next) => {
  const userId = req?.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { followId } = req.body;

  if (!followId) {
    return res.status(401).json({ message: "Please provide a follow id" });
  }

  try {
    const result = await query(
      "INSERT INTO follows (user_id, follow_id) VALUES ($1, $2) RETURNING *",
      [userId, followId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get Followers
router.get("/followers/:id", async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await query(
      "SELECT users.id, users.username, users.email, users.profile_photo, users.bio FROM users JOIN follows ON users.id = follows.user_id WHERE follows.follow_id = $1",
      [id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get Following
router.get("/following/:id", async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await query(
      "SELECT users.id, users.username, users.email, users.profile_photo, users.bio FROM users JOIN follows ON users.id = follows.follow_id WHERE follows.user_id = $1",
      [id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});
