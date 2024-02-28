const express = require("express");
const { query } = require("../config/db");
const Game = require("../models/Game");
const GameSession = require("../models/GameSession");
const { authenticate } = require("../middleware/auth");
const router = express.Router();

// Game Session Activity ----------------------------------------------------

// CREATE
// Create a game session activity
router.post("/:gameSessionId/create", authenticate, async (req, res, next) => {
  const { gameSessionId } = req.params;
  const { action } = req.body;

  if (!gameSessionId) {
    return res
      .status(401)
      .json({ message: "Please provide a game session id" });
  }

  // Get the Game Session
  const gameSession = await GameSession.findByGameSessionId(gameSessionId);
  if (!gameSession) {
    return res.status(404).json({ message: "Game session not found" });
  }

  // Ensure an activity with the same action AND game session id doesn't already exist
  const existingStartActivity = await query(
    "SELECT * FROM game_user_activity WHERE game_session_id = $1 AND action = 'Start'",
    [gameSessionId]
  );

  if (existingStartActivity.rows.length > 0 && action === "Start") {
    return res.status(400).json({
      message: `Start activity already exists for game session, ${gameSessionId}`,
    });
  }

  // If the action is "Stop", ensure the game session is active by first checking if there is an existing start activity
  if (existingStartActivity.rows.length > 0 && action === "Stop") {
    return res.status(400).json({
      message: `Unable to stop session, ${gameSessionId}, which has not called the 'Start' activity.`,
    });
  }

  const existingStopActivity = await query(
    "SELECT * FROM game_user_activity WHERE game_session_id = $1 AND action = 'Stop'",
    [gameSessionId]
  );

  if (existingStopActivity.rows.length > 0 && action === "Stop") {
    return res.status(400).json({
      message: `Stop activity already exists for game session, ${gameSessionId}`,
    });
  }

  try {
    const result = await query(
      "INSERT INTO game_user_activity (game_session_id, action) VALUES ($1, $2) RETURNING *",
      [gameSessionId, action]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// get all activities
router.get("/all", async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM game_user_activity");
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// get the current users activity
router.get("/current", authenticate, async (req, res, next) => {
  const userId = req?.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const result = await query(
      `
                SELECT *
                FROM game_user_activity AS gua
                JOIN game_session AS gs ON gua.game_session_id = gs.game_session_id
                WHERE gs.user_id = $1
              `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No game user activities found" });
    }
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// READ
// get an activity by activity id
router.get("/:gameUserActivityId", async (req, res, next) => {
  const { gameUserActivityId } = req.params;

  if (!gameUserActivityId) {
    return res
      .status(401)
      .json({ message: "Please provide a game user activity id" });
  }

  try {
    const result = await query(
      "SELECT * FROM game_user_activity WHERE game_user_activity_id = $1",
      [gameUserActivityId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Game user activity not found" });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// get all activities by session id
router.get("/:gameSessionId/all", async (req, res, next) => {
  const { gameSessionId } = req.params;

  if (!gameSessionId) {
    return res
      .status(401)
      .json({ message: "Please provide a game session id" });
  }

  try {
    const result = await query(
      "SELECT * FROM game_user_activity WHERE game_session_id = $1",
      [gameSessionId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No game user activities found" });
    }
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// get all activities by user id
router.get("/user/:userId", async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: "Please provide a user id" });
  }

  try {
    const result = await query(
      `
            SELECT *
            FROM game_user_activity AS gua
            JOIN game_session AS gs ON gua.game_session_id = gs.game_session_id
            WHERE gs.user_id = $1
            `,
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No game user activities found" });
    }
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// get the current users activity by game id
router.get("/current/:gameId", authenticate, async (req, res, next) => {
  const userId = req?.user?.id;
  const { gameId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!gameId) {
    return res.status(401).json({ message: "Please provide a game id" });
  }

  try {
    const result = await query(
      `
        SELECT *
        FROM game_user_activity AS gua
        JOIN game_session AS gs ON gua.game_session_id = gs.game_session_id
        WHERE gs.user_id = $1 AND gs.game_id = $2
    `,
      [userId, gameId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No game user activities found" });
    }
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
