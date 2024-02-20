const express = require("express");
const { query } = require("../config/db");
const router = express.Router();

// Algorithmic Endpoints ----------------------------------------------------

// get all time top played games
router.get("/topPlayed", async (req, res, next) => {
  try {
    const result = await query(
      `
          SELECT game_id, COUNT(game_id) AS play_count
          FROM game_session
          GROUP BY game_id
          ORDER BY play_count DESC
          LIMIT 10
        `
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// get all time top played games by user id
router.get("/topPlayed/user/:userId", async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: "Please provide a user id" });
  }

  try {
    const result = await query(
      `
          SELECT game_id, COUNT(game_id) AS play_count
          FROM game_session
          WHERE user_id = $1
          GROUP BY game_id
          ORDER BY play_count DESC
          LIMIT 10
        `,
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// get top trending games (top games in the last 30 days)
router.get("/topTrending", async (req, res, next) => {
  try {
    const result = await query(
      `
          SELECT game_id, COUNT(game_id) AS play_count
          FROM game_session
          WHERE created_at > NOW() - INTERVAL '5 days'
          GROUP BY game_id
          ORDER BY play_count DESC
        `
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// get top trending games by user id (top games in the last 30 days)
router.get("/topTrending/user/:userId", async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: "Please provide a user id" });
  }

  try {
    const result = await query(
      `
          SELECT game_id, COUNT(game_id) AS play_count
          FROM game_session
          WHERE user_id = $1 AND created_at > NOW() - INTERVAL 30 DAY
          GROUP BY game_id
          ORDER BY play_count DESC
          LIMIT 10
        `,
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// get ranked list of sessions by game id, based on score
router.get("/:gameId/leaderboards", async (req, res, next) => {
  const { gameId } = req.params;

  if (!gameId) {
    return res.status(401).json({ message: "Please provide a game id" });
  }

  try {
    const result = await query(
      `
          SELECT game_session_id, user_id, session_total_score
          FROM game_session
          JOIN users ON game_session.user_id = users.id
          WHERE game_id = $1
          ORDER BY session_total_score DESC
        `,
      [gameId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// get all games and order by date `created_at` DESC
router.get("/new", async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM games ORDER BY created_at DESC");
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// get all games and order by date `updated_at` DESC
router.get("/recent", async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM games ORDER BY updated_at DESC");
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
