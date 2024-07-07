const express = require("express");
const { query } = require("../config/db");
const { authenticate } = require("../middleware/auth");
const { sendNotification } = require("../utils/sendNotification");
const Favorite = require("../models/Favorite");
const Game = require("../models/Game");

const router = express.Router();

router.post("/add", authenticate, async (req, res, next) => {
  const userId = req?.user?.id;
  const username = req?.user?.username;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { gameId } = req.body;

  if (!gameId) {
    return res.status(401).json({ message: "Please provide a game id" });
  }

  const game = await Game.findById(gameId);

  try {
    const result = await query(
      "INSERT INTO favorites (user_id, game_id) VALUES ($1, $2) RETURNING *",
      [userId, gameId]
    );

    const notification = {
      recipient_id: game.user_id,
      sender_id: userId,
      type: "favorite",
      entity_id: gameId,
      entity_type: "game",
      message: `${username} liked your game ${gameId}`,
    };
    await sendNotification(notification);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete("/delete/:id", authenticate, async (req, res, next) => {
  // Remove from Favorites table
  const { id } = req.params;
  const userId = req?.user?.id;

  const favorite = await Favorite.findByGameAndUserId(id, userId);

  if (!favorite) {
    return res.status(404).json({ message: "Favorite not found" });
  }

  if (!userId || userId.toString() !== favorite.user_id.toString()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await query("DELETE FROM favorites WHERE id = $1", [favorite?.id]);
    res.status(200).json({ message: "Favorite deleted" });
  } catch (error) {
    next(error);
  }
});

// Get my favorites (published and unpublished games)
router.get("/user", authenticate, async (req, res, next) => {
  const userId = req?.user?.id;

  if (!userId) {
    return res
      .status(404)
      .json({ message: "You must be logged in to view your favorites" });
  }

  try {
    // Join the 'favorites' table with the 'games' table
    const result = await query(
      "SELECT g.* FROM games g INNER JOIN favorites f ON g.id = f.game_id WHERE f.user_id = $1 ORDER BY g.id DESC",
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get all favorites (published games only) for a user
router.get("/single/user/:id", async (req, res, next) => {
  const userId = req?.params?.id;

  if (!userId) {
    return res.status(400).json({ message: "Please pass a user id" });
  }

  try {
    // Join the 'favorites' table with the 'games' table
    const result = await query(
      "SELECT g.* FROM games g INNER JOIN favorites f ON g.id = f.game_id WHERE g.published = true AND f.user_id = $1 ORDER BY g.id DESC",
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get all favorites for a game
router.get("/games/:id", async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await query(
      "SELECT * FROM favorites WHERE game_id = $1 ORDER BY id DESC",
      [id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
