const express = require("express");
const { query } = require("../config/db");
const Game = require("../models/Game");
const GameSession = require("../models/GameSession");
const { authenticate } = require("../middleware/auth");
const router = express.Router();

// Game Sessions -----------------------------------------------------------

// CREATE
// Create a game session
router.post("/games/:gameId/create", authenticate, async (req, res, next) => {
  const { gameId } = req.params;
  let userId = req?.user?.id;

  // if there's no user id, assign the session to a anonymous user (for now)
  if (!userId) {
    userId = `anonymous_${Math.random().toString(36).substr(2, 9)}`;
  }

  if (!gameId) {
    return res.status(401).json({ message: "Please provide a game id" });
  }

  const game = await Game.findById(gameId);
  if (!game) {
    return res.status(404).json({ message: "Game not found" });
  }

  try {
    const result = await query(
      "INSERT INTO game_session (game_id, user_id) VALUES ($1, $2) RETURNING *",
      [gameId, userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// READ

// Get all sessions
router.get("/all", async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM game_session");
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get all game sessions by user ID
router.get("/users/:userId", async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: "Please provide a user id" });
  }

  try {
    const result = await query(
      "SELECT * FROM game_session WHERE user_id = $1",
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No game sessions found" });
    }
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// UPDATE
// Update a game session
router.put("/:gameSessionId", authenticate, async (req, res, next) => {
  const { gameSessionId } = req.params;
  const userId = req?.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!gameSessionId) {
    return res
      .status(401)
      .json({ message: "Please provide a game session id" });
  }

  const gameSession = await GameSession.findByGameSessionId(gameSessionId);
  if (!gameSession) {
    return res.status(404).json({ message: "Game session not found" });
  }

  const {
    sessionTotalTime = gameSession?.sessionTotalTime,
    sessionTotalScore = gameSession?.sessionTotalScore,
  } = req.body;

  try {
    const result = await query(
      "UPDATE game_session SET user_id = $1, session_total_time = $2, session_total_score = $3, WHERE game_session_id = $4 RETURNING *",
      [userId, sessionTotalTime, sessionTotalScore, gameSessionId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get a single game session by session ID
router.get("/sessions/:gameSessionId", async (req, res, next) => {
  const { gameSessionId } = req.params;

  if (!gameSessionId) {
    return res
      .status(401)
      .json({ message: "Please provide a game session id" });
  }

  try {
    const result = await query(
      "SELECT * FROM game_session WHERE game_session_id = $1",
      [gameSessionId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Game session not found" });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get all game sessions by game ID
router.get("/:gameId/sessions", async (req, res, next) => {
  const { gameId } = req.params;

  if (!gameId) {
    return res.status(401).json({ message: "Please provide a game id" });
  }

  try {
    const result = await query(
      "SELECT * FROM game_session WHERE game_id = $1",
      [gameId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No game sessions found" });
    }
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// DELETE
// Delete a game session
