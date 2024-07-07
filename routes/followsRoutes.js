const express = require("express");
const { query } = require("../config/db");
const { authenticate } = require("../middleware/auth");
const { sendNotification } = require("../utils/sendNotification");
const User = require("../models/User");
const Follows = require("../models/Follows");

const router = express.Router();

// User follows another user
router.post("/follow/:followingId", authenticate, async (req, res, next) => {
  const followerId = req?.user?.id;
  const username = req?.user?.username;

  if (!followerId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { followingId } = req.params;

  if (!followingId) {
    return res.status(401).json({ message: "No follow id provided" });
  }

  // Check if user is trying to follow themselves
  if (followerId?.toString() === followingId?.toString()) {
    return res.status(400).json({ message: "You cannot follow yourself" });
  }

  // Check if user is already following the user
  const follow = await Follows.findByFollowAndUserId(followingId, followerId);
  if (follow) {
    return res
      .status(400)
      .json({ message: "You are already following this user" });
  }

  try {
    const result = await query(
      "INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) RETURNING *",
      [followerId, followingId]
    );

    const notification = {
      recipient_id: parseInt(followingId),
      sender_id: parseInt(followerId),
      type: "follow",
      entity_id: parseInt(followerId),
      entity_type: "user",
      message: `${username} followed you`,
    };
    await sendNotification(notification);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// User unfollows another user
router.delete(
  "/unfollow/:followingId",
  authenticate,
  async (req, res, next) => {
    const { followingId } = req.params;
    const followerId = req?.user?.id;

    const follow = await Follows.findByFollowAndUserId(followingId, followerId);

    if (!follow) {
      return res.status(404).json({ message: "No connection found." });
    }

    if (
      !followerId ||
      followerId.toString() !== follow.follower_id.toString()
    ) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      await query("DELETE FROM follows WHERE follow_id = $1", [
        follow?.follow_id,
      ]);
      res.status(200).json({ message: "Follow deleted" });
    } catch (error) {
      next(error);
    }
  }
);

// Get Followers
router.get("/followers/:userId", async (req, res, next) => {
  const { userId } = req.params;

  try {
    const result = await query(
      "SELECT users.id, users.username, users.profile_photo, users.bio FROM users JOIN follows ON users.id = follows.follower_id WHERE follows.following_id = $1",
      [userId]
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
      "SELECT users.id, users.username, users.profile_photo, users.bio FROM users JOIN follows ON users.id = follows.following_id WHERE follows.follower_id = $1",
      [id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
