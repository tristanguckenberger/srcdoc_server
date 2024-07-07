const express = require("express");
const { query } = require("../config/db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Get all notifications from a user
router.get("/users/:userId", authenticate, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await query(
      `SELECT 
        notifications.*, 
        sender.username AS sender_username, 
        sender.profile_photo AS sender_profile_photo,
            CASE 
                WHEN notifications.entity_type = 'game' THEN games.title 
                WHEN notifications.entity_type = 'comment' THEN comment_games.title 
                WHEN notifications.entity_type = 'review' THEN reviews.title 
                WHEN notifications.entity_type = 'follow' THEN NULL 
                ELSE NULL 
            END AS entity_title,
            CASE 
                WHEN notifications.entity_type = 'game' THEN games.thumbnail 
                WHEN notifications.entity_type = 'comment' THEN comment_games.thumbnail 
                WHEN notifications.entity_type = 'review' THEN reviews.body 
                WHEN notifications.entity_type = 'follow' THEN NULL 
                ELSE NULL 
            END AS entity_thumbnail,
            CASE 
                WHEN notifications.entity_type = 'game' THEN games.description 
                WHEN notifications.entity_type = 'comment' THEN comment_games.description 
                WHEN notifications.entity_type = 'review' THEN reviews.body
                WHEN notifications.entity_type = 'follow' THEN NULL 
                ELSE NULL 
            END AS entity_description,
            CASE 
                WHEN notifications.entity_type = 'game' THEN NULL
                WHEN notifications.entity_type = 'comment' THEN comments.comment_text 
                WHEN notifications.entity_type = 'review' THEN reviews.body
                WHEN notifications.entity_type = 'follow' THEN NULL 
                ELSE NULL 
            END AS entity_primary_text
        FROM notifications
        JOIN users AS sender ON notifications.sender_id = sender.id
        LEFT JOIN games ON notifications.entity_type = 'game' AND notifications.entity_id = games.id
        LEFT JOIN comments ON notifications.entity_type = 'comment' AND notifications.entity_id = comments.id
        LEFT JOIN games AS comment_games ON comments.game_id = comment_games.id
        LEFT JOIN reviews ON notifications.entity_type = 'review' AND notifications.entity_id = reviews.id
        WHERE notifications.recipient_id = $1
        ORDER BY notifications.created_at DESC;`,
      [userId]
    );
    res.status(200).json(result.rows);
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
