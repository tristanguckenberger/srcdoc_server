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

  if (!gameSessionId) {
    return res
      .status(401)
      .json({ message: "Please provide a game session id" });
  }

  const gameSession = await GameSession.findByGameSessionId(gameSessionId);
  if (!gameSession) {
    return res.status(404).json({ message: "Game session not found" });
  }

  const existingStartActivity = await query(
    "SELECT * FROM game_user_activity WHERE game_session_id = $1 AND action = 'Start'",
    [gameSessionId]
  );

  if (existingStartActivity.rows.length === 0) {
    return res.status(400).json({
      message: "Cannot update a game session without a start activity",
    });
  }

  let {
    sessionTotalTime = gameSession?.sessionTotalTime,
    sessionTotalScore = gameSession?.sessionTotalScore,
  } = req.body;

  // if theres no session total time, we need to calculate it
  if (!sessionTotalTime) {
    // get start AND stop times
    let stopTime = await query(
      "SELECT * FROM game_user_activity WHERE game_session_id = $1 AND action = 'Stop'",
      [gameSessionId]
    );

    // if there's no start time, we can go ahead and create one
    if (stopTime.rows.length === 0) {
      const addStopTime = await query(
        "INSERT INTO game_user_activity (game_session_id, action) VALUES ($1, $2) RETURNING *",
        [gameSessionId, "Stop"]
      );
      stopTime = addStopTime.rows[0];
    } else {
      stopTime = stopTime.rows[0];
    }

    const startTime = new Date(existingStartActivity.rows[0].created_at);
    const endTime = new Date(stopTime.created_at);

    sessionTotalTime = endTime - startTime;

    const differenceInMilliseconds = endTime - startTime;
    const differenceInSeconds = differenceInMilliseconds / 1000;
    const differenceInMinutes = differenceInSeconds / 60;
    const differenceInHours = differenceInMinutes / 60;
    const millisecondsInASecond = 1000;
    const secondsInAMinute = 60;
    const minutesInAnHour = 60;
    const hoursInADay = 24;

    // First, calculate the total number of days
    const days = Math.floor(
      differenceInMilliseconds /
        (millisecondsInASecond *
          secondsInAMinute *
          minutesInAnHour *
          hoursInADay)
    );

    // Calculate the remainder for hours calculation
    const hoursRemainder =
      differenceInMilliseconds %
      (millisecondsInASecond *
        secondsInAMinute *
        minutesInAnHour *
        hoursInADay);

    // Calculate the total number of hours
    const hours = Math.floor(
      hoursRemainder /
        (millisecondsInASecond * secondsInAMinute * minutesInAnHour)
    );

    // Calculate the remainder for minutes calculation
    const minutesRemainder =
      hoursRemainder %
      (millisecondsInASecond * secondsInAMinute * minutesInAnHour);

    // Calculate the total number of minutes
    const minutes = Math.floor(
      minutesRemainder / (millisecondsInASecond * secondsInAMinute)
    );

    // Calculate the remainder for seconds calculation
    const secondsRemainder =
      minutesRemainder % (millisecondsInASecond * secondsInAMinute);

    // Calculate the total number of seconds
    const seconds = Math.floor(secondsRemainder / millisecondsInASecond);

    // The remainder now are the milliseconds
    const milliseconds = secondsRemainder % millisecondsInASecond;

    // Format the output
    sessionTotalTime = `${days.toString().padStart(2, "0")}d:${hours
      .toString()
      .padStart(2, "0")}h:${minutes.toString().padStart(2, "0")}m:${seconds
      .toString()
      .padStart(2, "0")}s:${milliseconds.toString().padStart(3, "0")}ms`;
  }

  try {
    const result = await query(
      "UPDATE game_session SET session_total_time = $1, session_total_score = $2 WHERE game_session_id = $3 RETURNING *",
      [sessionTotalTime, sessionTotalScore, gameSessionId]
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

module.exports = router;
