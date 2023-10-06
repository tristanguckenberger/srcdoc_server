const express = require("express");
const { query } = require("../config/db");
const { authenticate } = require("../middleware/auth");
const Favorite = require("../models/Favorite");

const router = express.Router();

router.post("/add", authenticate, async (req, res, next) => {
  const userId = req?.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { gameId } = req.body;

  if (!gameId) {
    return res.status(401).json({ message: "Please provide a game id" });
  }

  try {
    const result = await query(
      "INSERT INTO favorites (user_id, game_id) VALUES ($1, $2) RETURNING *",
      [userId, gameId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete("/delete/:id", authenticate, async (req, res, next) => {
  // Remove from Favorites table
  const { id } = req.params;
  const userId = req?.user?.id;

  const favorite = await Favorite.findById(id);

  if (!favorite) {
    return res.status(404).json({ message: "Favorite not found" });
  }

  if (!userId || userId.toString() !== favorite.user_id.toString()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await query("DELETE FROM favorites WHERE id = $1", [id]);
    res.status(200).json({ message: "Favorite deleted" });
  } catch (error) {
    next(error);
  }
});

// Get all favorites for a user
router.get("/users/:id", async (req, res, next) => {
  const userId = req?.params?.id;

  if (!userId) {
    return res.status(404).json({ message: "Please pass in a user ID" });
  }

  try {
    const result = await query(
      "SELECT * FROM favorites WHERE user_id = $1 ORDER BY id DESC",
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
