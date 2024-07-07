const express = require("express");
const { query } = require("../config/db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Get all notifications from a user
router.get("/users/:userId", authenticate, async (req, res, next) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit, 10) || 50; // Default limit to 50 notifications
  const offset = parseInt(req.query.offset, 10) || 0;

  const fetchNotifications = async (userId, limit, offset) => {
    return await query(
      `SELECT 
        notifications.*, 
        sender.username AS sender_username, 
        sender.profile_photo AS sender_profile_photo
      FROM notifications
      JOIN users AS sender ON notifications.sender_id = sender.id
      WHERE notifications.recipient_id = $1
      ORDER BY notifications.created_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
  };

  const fetchAssociatedData = async (notifications) => {
    const gameIds = notifications
      .filter((n) => n.entity_type === "game")
      .map((n) => n.entity_id);
    const commentIds = notifications
      .filter((n) => n.entity_type === "comment")
      .map((n) => n.entity_id);
    const reviewIds = notifications
      .filter((n) => n.entity_type === "review")
      .map((n) => n.entity_id);

    const games = await query(`SELECT * FROM games WHERE id = ANY($1::int[])`, [
      gameIds,
    ]);
    const comments = await query(
      `SELECT * FROM comments WHERE id = ANY($1::int[])`,
      [commentIds]
    );
    const reviews = await query(
      `SELECT * FROM reviews WHERE id = ANY($1::int[])`,
      [reviewIds]
    );
    const commentGames = await query(
      `SELECT * FROM games WHERE id = ANY(SELECT game_id FROM comments WHERE id = ANY($1::int[]))`,
      [commentIds]
    );

    return {
      games: games.rows,
      comments: comments.rows,
      reviews: reviews.rows,
      commentGames: commentGames.rows,
    };
  };

  try {
    // Fetch total notifications count
    const totalNotificationsResult = await query(
      `SELECT COUNT(*) AS total FROM notifications WHERE recipient_id = $1`,
      [userId]
    );
    const totalNotifications = totalNotificationsResult.rows[0].total;

    // Fetch paginated notifications
    const notificationsResult = await fetchNotifications(userId, limit, offset);
    const notifications = notificationsResult.rows;

    // Fetch associated data
    const associatedData = await fetchAssociatedData(notifications);

    // Combine data
    const combinedNotifications = notifications.map((notification) => {
      const associatedGame = associatedData.games.find(
        (g) => g.id === notification.entity_id
      );
      const associatedComment = associatedData.comments.find(
        (c) => c.id === notification.entity_id
      );
      const associatedReview = associatedData.reviews.find(
        (r) => r.id === notification.entity_id
      );
      const associatedCommentGame = associatedData.commentGames.find(
        (g) => g.id === associatedComment?.game_id
      );

      return {
        ...notification,
        entity_title:
          associatedGame?.title ||
          associatedCommentGame?.title ||
          associatedReview?.title ||
          null,
        entity_thumbnail:
          associatedGame?.thumbnail || associatedCommentGame?.thumbnail || null,
        entity_description:
          associatedGame?.description ||
          associatedCommentGame?.description ||
          associatedReview?.body ||
          null,
        entity_primary_text:
          associatedComment?.comment_text || associatedReview?.body || null,
      };
    });

    res.status(200).json({
      notifications: combinedNotifications,
      total: totalNotifications,
    });
  } catch (error) {
    next(error);
  }
});

// Update notifications
router.put("/update", authenticate, async (req, res, next) => {
  try {
    const { ids } = req.body; // Array of notification IDs
    const userId = req?.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    if (!ids || !Array.isArray(ids)) {
      return res
        .status(400)
        .json({ message: "Please pass an array of notification ids" });
    }

    // Check if the notifications exist and belong to the user
    const notifications = await query(
      "SELECT * FROM notifications WHERE id = ANY($1::int[]) AND recipient_id = $2",
      [ids, userId]
    );

    if (notifications.rows.length === 0) {
      return res.status(404).json({ message: "No notifications found" });
    }

    // Update the read status for the notifications
    const result = await query(
      "UPDATE notifications SET read = true WHERE id = ANY($1::int[]) RETURNING *",
      [ids]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.log("error::", error);
    next(error);
  }
});

module.exports = router;
