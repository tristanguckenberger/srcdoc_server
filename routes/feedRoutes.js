const express = require("express");
const { query } = require("../config/db");
const Game = require("../models/Game");
const GameSession = require("../models/GameSession");
const { authenticate } = require("../middleware/auth");
const router = express.Router();

// Get simple feed for a user
// TODO: Add pagination
router.get("/simple", authenticate, async (req, res, next) => {
  const { id } = req?.user;

  if (!id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Gets all activities for followed users including new games, new comments, new (first-time) game sessions, and new favorites
    // TODO: Add check for new *public* playlists
    const activities = await query(
      `SELECT DISTINCT a.user_id, a.username, a.profile_photo, a.primary_text, a.activity_item_type, a.target_id, a.target_image, a.timestamp
        FROM (
            SELECT f.following_id AS user_id, u.username, u.profile_photo, 
                (u.username || ' published a game') AS primary_text, 
                'games' AS activity_item_type, g.id AS target_id, g.thumbnail AS target_image, g.updated_at AS timestamp
            FROM follows f
            JOIN users u ON u.id = f.following_id
            JOIN games g ON f.following_id = g.user_id
            WHERE f.follower_id = $1 AND g.updated_at >= NOW() - INTERVAL '7 days'
            
            UNION ALL
            
            SELECT f.following_id AS user_id, u.username, u.profile_photo, 
                (u.username || ' left a comment') AS primary_text, 
                'comments' AS activity_item_type, c.id AS target_id, NULL AS target_image, c.created_at AS timestamp
            FROM follows f
            JOIN users u ON u.id = f.following_id
            JOIN comments c ON f.following_id = c.user_id
            WHERE f.follower_id = $1 AND c.created_at >= NOW() - INTERVAL '7 days'
            
            UNION ALL
            
            SELECT DISTINCT ON (gs.game_id) f.following_id AS user_id, u.username, u.profile_photo, 
                (u.username || ' played "' || games.title || '" for the first time') AS primary_text, 
                'game_session' AS activity_item_type, gs.game_id AS target_id, games.thumbnail AS target_image, gs.created_at AS timestamp
            FROM follows f
            JOIN users u ON u.id = f.following_id
            JOIN game_session gs ON f.following_id = gs.user_id
            JOIN games ON gs.game_id = games.id
            WHERE f.follower_id = $1 AND gs.created_at >= NOW() - INTERVAL '7 days'
            
            UNION ALL
            
            SELECT f.following_id AS user_id, u.username, u.profile_photo, 
                (u.username || ' liked "' || game.title || '"') AS primary_text, 
                'favorites' AS activity_item_type, fav.game_id AS target_id, game.thumbnail AS target_image, fav.timestamp AS timestamp
            FROM follows f
            JOIN users u ON u.id = f.following_id
            JOIN favorites fav ON f.following_id = fav.user_id
            JOIN games game ON game.id = fav.game_id
            WHERE f.follower_id = $1 AND fav.timestamp >= NOW() - INTERVAL '7 days'
        ) a
        ORDER BY a.user_id, a.activity_item_type, a.timestamp DESC`,
      [id]
    );

    res.status(200).json(activities.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
