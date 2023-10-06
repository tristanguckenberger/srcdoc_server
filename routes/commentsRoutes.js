const express = require("express");
const { query } = require("../config/db");
const router = express.Router();
const { authenticate } = require("../middleware/auth");

// Add comment to Comments table
router.post("/create", authenticate, async (req, res, next) => {
  const userId = req?.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { gameId, parentCommentId, commentText } = req.body;

  if (!gameId) {
    return res.status(401).json({ message: "Please provide a game id" });
  }

  try {
    const result = await query(
      "INSERT INTO favorites (user_id, game_id, parent_comment_id, comment_text) VALUES ($1, $2, $3, $4) RETURNING *",
      [userId, gameId, parentCommentId, commentText]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get all comments
router.get("/all", async (req, res) => {
  try {
    const result = await query("SELECT * FROM comments");
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get single comment by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query("SELECT * FROM comments WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Comment not found" });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get all comments for a game
router.get("/game/:gameId", async (req, res) => {
  try {
    const { gameId } = req.params;
    const result = await query("SELECT * FROM comments WHERE game_id = $1", [
      gameId,
    ]);
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get all comments for a user
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await query("SELECT * FROM comments WHERE user_id = $1", [
      userId,
    ]);
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Update single comment
router.put("/update/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  const userId = req?.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const comment = await Comment.findById(id);

  if (!comment) {
    return res
      .status(404)
      .json({ message: `Comment with ID: ${id} not found` });
  }

  if (userId.toString() !== comment.user_id.toString()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const allowedFields = ["comment_text"];
  const updates = Object.keys(req.body);

  // Filtering out invalid field names
  const validUpdates = updates.filter((update) =>
    allowedFields.includes(update)
  );

  if (validUpdates?.length === 0) {
    return res.status(400).json({ message: "No valid fields for update" });
  }

  try {
    const result = await query(
      `UPDATE comments SET ${validUpdates
        .map((field, index) => `${field}=$${index + 1}`)
        .join(", ")} WHERE id = ${id} RETURNING *`,
      validUpdates.map((field) => req.body[field])
    );
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete single comment
router.delete("/delete/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  const userId = req?.user?.id;

  const comment = await Comment.findById(id);

  if (!comment) {
    return res.status(404).json({ message: "Comment not found" });
  }

  if (userId.toString() !== comment.user_id.toString()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await query("DELETE FROM comments WHERE id = $1", [id]);
    res.status(200).json({ message: "Comment deleted" });
  } catch (error) {
    next(error);
  }
});

// Get all replies for a comment
router.get("/replies/:commentId", async (req, res) => {
  try {
    const { commentId } = req.params;
    const result = await query(
      "SELECT * FROM comments WHERE parent_comment_id = $1",
      [commentId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
