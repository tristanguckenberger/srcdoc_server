const express = require("express");
const { query } = require("../config/db");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const Issue = require("../models/Issue");

// Add issue to Issues table
router.post("/create", authenticate, async (req, res, next) => {
  const userId = req?.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { gameId, issueText } = req.body;

  if (!gameId) {
    return res.status(401).json({ message: "Please provide a game id" });
  }

  try {
    const result = await query(
      "INSERT INTO issues (user_id, game_id, issue_text) VALUES ($1, $2, $3) RETURNING *",
      [userId, gameId, issueText]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get all issues
router.get("/all", async (req, res) => {
  try {
    const result = await query("SELECT * FROM issues");
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get single issue by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query("SELECT * FROM issues WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Issue not found" });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get all issues for a game
router.get("/game/:gameId", async (req, res) => {
  try {
    const { gameId } = req.params;
    const result = await query("SELECT * FROM issues WHERE game_id = $1", [
      gameId,
    ]);
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Update single issue
router.put("/update/:id", authenticate, async (req, res, next) => {
  const { id } = req.params;
  const userId = req?.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { issueText } = req.body;

  try {
    const result = await query(
      "UPDATE issues SET issue_text = $1 WHERE id = $2 RETURNING *",
      [issueText, id]
    );
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete single issue
router.delete("/delete/:id", authenticate, async (req, res, next) => {
  const { id } = req.params;
  const userId = req?.user?.id;

  const issue = await Issue.findById(id);

  if (!issue) {
    return res.status(404).json({ message: "Comment not found" });
  }

  if (userId.toString() !== issue.user_id.toString()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await query("DELETE FROM issues WHERE id = $1", [id]);
    res.status(200).json({ message: "Issue deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
