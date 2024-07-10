const express = require("express");
const { query } = require("../config/db");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { logActivity } = require("../middleware/activity");
const { sendNotification } = require("../utils/sendNotification");
const Comment = require("../models/Comment");
const Game = require("../models/Game");

const getCommentActivityData = async (req, res) => {
  const userId = req?.user?.id;
  const { gameId, commentText } = req.body;

  // Assume the result contains the comment ID after insertion
  const result = await query(
    "INSERT INTO comments (user_id, game_id, parent_comment_id, comment_text) VALUES ($1, $2, $3, $4) RETURNING *",
    [userId, gameId, req.body.parentCommentId, commentText]
  );

  const commentId = result.rows[0].id;

  const commentData = {
    user_id: userId,
    target_id: commentId,
    primary_text: commentText,
    activity_type: "passive",
    target_type: "comment",
  };

  req.comment = commentData;

  return commentData;
};

// Add comment to Comments table
router.post("/create", authenticate, async (req, res, next) => {
  const userId = req?.user?.id;
  const username = req?.user?.username;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { gameId, parentCommentId, commentText } = req.body;

  if (!gameId) {
    return res.status(401).json({ message: "Please provide a game id" });
  }

  const game = await Game.findById(gameId);

  try {
    await logActivity(getCommentActivityData)(req, res, async () => {
      const commentId = req?.comment?.target_id;
      const result = await Comment.findById(commentId);
      console.log("result::", result);
      const notification = {
        recipient_id: parseInt(game?.user_id),
        sender_id: parseInt(userId),
        type: "comment",
        entity_id: game?.id,
        entity_type: "comment",
        message: `${username} commented on your game`,
      };

      console.log("notification::before::", notification);

      await sendNotification(notification);

      res.status(201).json(result);
    });
  } catch (error) {
    next(error);
  }
});

// Get all comments
router.get("/all", async (req, res) => {
  try {
    const result = await query(
      "SELECT comments.*, users.profile_photo, users.username FROM comments JOIN users ON comments.user_id = users.id"
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get single comment by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      "SELECT comments.*, users.profile_photo, users.username FROM comments JOIN users ON comments.user_id = users.id WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Comment not found" });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get all comments for a game
router.get("/game/:gameId", async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const result = await query(
      "SELECT comments.*, users.profile_photo, users.username FROM comments JOIN users ON comments.user_id = users.id WHERE game_id = $1",
      [gameId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// NOT IN USE, WORK IN PROGRESS
router.get("/paginated/:gameId/comments", async (req, res, next) => {
  const { gameId } = req.params;
  const limit = parseInt(req.query.limit, 10) || 50; // Default limit to 50 comments
  const offset = parseInt(req.query.offset, 10) || 0;

  const fetchComments = async (gameId, limit, offset) => {
    return await query(
      `SELECT
        comments.*,
        users.profile_photo,
        users.username
      FROM comments
      JOIN users ON comments.user_id = users.id
      WHERE game_id = $1
      ORDER BY comments.created_at DESC
      LIMIT $2 OFFSET $3`,
      [gameId, limit, offset]
    );
  };

  const fetchAssociatedData = async (comments) => {
    const userIds = comments.map((c) => c.user_id);

    const users = await query(
      `SELECT id, profile_photo, username FROM users WHERE id = ANY($1::int[])`,
      [userIds]
    );

    return {
      users: users.rows,
    };
  };

  try {
    // Fetch total comments count
    const totalCommentsResult = await query(
      `SELECT COUNT(*) AS total FROM comments WHERE game_id = $1`,
      [gameId]
    );
    const totalComments = totalCommentsResult.rows[0].total;

    // Fetch paginated comments
    const commentsResult = await fetchComments(gameId, limit, offset);
    const comments = commentsResult.rows;

    // Fetch associated data
    const associatedData = await fetchAssociatedData(comments);

    // Combine data
    const combinedComments = comments.map((comment) => {
      const user = associatedData.users.find((u) => u.id === comment.user_id);

      return {
        ...comment,
        profile_photo: user?.profile_photo || null,
        username: user?.username || null,
      };
    });

    res.status(200).json({
      comments: combinedComments,
      total: totalComments,
    });
  } catch (error) {
    next(error);
  }
});

// Get all comments for a user
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await query(
      "SELECT comments.*, users.profile_photo, users.username FROM comments JOIN users ON comments.user_id = users.id WHERE comments.user_id = $1",
      [userId]
    );
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
      "SELECT comments.*, users.profile_photo, users.username FROM comments JOIN users ON comments.user_id = users.id WHERE parent_comment_id = $1",
      [commentId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
