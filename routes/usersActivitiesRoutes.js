const express = require("express");
const { query } = require("../config/db");
const router = express.Router();

// Get all activities for a user
router.get("/users/:id/activities", async (req, res) => {
  const { id } = req.params;

  try {
    const activities = await query(
      `SELECT 
        activity.*, 
        users.username, 
        users.profile_photo, 
        CASE 
            WHEN activity.target_type = 'game' THEN games.title 
            WHEN activity.target_type = 'game_session' THEN games.title 
            WHEN activity.target_type = 'comment' THEN comment_games.title 
            ELSE NULL 
        END AS game_title,
        CASE 
            WHEN activity.target_type = 'game' THEN games.thumbnail 
            WHEN activity.target_type = 'game_session' THEN games.thumbnail 
            WHEN activity.target_type = 'comment' THEN comment_games.thumbnail 
            ELSE NULL 
        END AS game_thumbnail,
        CASE 
            WHEN activity.target_type = 'game' THEN games.description 
            WHEN activity.target_type = 'game_session' THEN games.description 
            WHEN activity.target_type = 'comment' THEN comment_games.description 
            ELSE NULL 
        END AS game_description,
        CASE 
            WHEN activity.target_type = 'comment' THEN comments.game_id 
            ELSE NULL 
        END AS comment_game_id,
        CASE 
            WHEN activity.target_type = 'comment' THEN comments.comment_text 
            ELSE NULL 
        END AS comment_text
        FROM activity 
        JOIN users ON activity.user_id = users.id
        LEFT JOIN games ON (activity.target_type = 'game' OR activity.target_type = 'game_session') AND activity.target_id = games.id
        LEFT JOIN comments ON activity.target_type = 'comment' AND activity.target_id = comments.id
        LEFT JOIN games AS comment_games ON comments.game_id = comment_games.id
        WHERE activity.user_id = $1 
        ORDER BY timestamp DESC`,
      [id]
    );

    res.status(200).json(activities.rows);
  } catch (error) {
    console.error("Error fetching user activities:", error);
    res.status(500).json({ message: "Error fetching user activities" });
  }
});

module.exports = router;
