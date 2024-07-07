const express = require("express");
const { query } = require("../config/db");
const router = express.Router();

// Get all activities for a user
router.get("/users/:id/activities", async (req, res) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit, 10) || 50; // Default limit to 50 activities
  const offset = parseInt(req.query.offset, 10) || 0;

  const fetchActivities = async (userId, limit, offset) => {
    return await query(
      `SELECT 
        activity.*, 
        users.username, 
        users.profile_photo
        FROM activity 
        JOIN users ON activity.user_id = users.id
        WHERE activity.user_id = $1 
        ORDER BY timestamp DESC
        LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
  };

  const fetchAssociatedData = async (activities) => {
    const gameIds = activities
      .filter(
        (a) => a.target_type === "game" || a.target_type === "game_session"
      )
      .map((a) => a.target_id);
    const commentIds = activities
      .filter((a) => a.target_type === "comment")
      .map((a) => a.target_id);

    const games = await query(`SELECT * FROM games WHERE id = ANY($1::int[])`, [
      gameIds,
    ]);
    const comments = await query(
      `SELECT * FROM comments WHERE id = ANY($1::int[])`,
      [commentIds]
    );
    const commentGames = await query(
      `SELECT * FROM games WHERE id = ANY(SELECT game_id FROM comments WHERE id = ANY($1::int[]))`,
      [commentIds]
    );

    return {
      games: games.rows,
      comments: comments.rows,
      commentGames: commentGames.rows,
    };
  };

  try {
    const totalActivitiesResult = await query(
      `SELECT COUNT(*) AS total FROM activity WHERE user_id = $1`,
      [id]
    );

    const totalActivities = totalActivitiesResult.rows[0].total;
    const activitiesResult = await fetchActivities(id, limit, offset);
    const activities = activitiesResult.rows;
    const associatedData = await fetchAssociatedData(activities);

    // Combine data
    const combinedActivities = activities.map((activity) => {
      const associatedGame = associatedData.games.find(
        (g) => g.id === activity.target_id
      );
      const associatedComment = associatedData.comments.find(
        (c) => c.id === activity.target_id
      );
      const associatedCommentGame = associatedData.commentGames.find(
        (g) => g.id === associatedComment?.game_id
      );

      return {
        ...activity,
        game_title:
          associatedGame?.title || associatedCommentGame?.title || null,
        game_thumbnail:
          associatedGame?.thumbnail || associatedCommentGame?.thumbnail || null,
        game_description:
          associatedGame?.description ||
          associatedCommentGame?.description ||
          null,
        comment_game_id: associatedComment?.game_id || null,
        comment_text: associatedComment?.comment_text || null,
      };
    });

    res
      .status(200)
      .json({ activities: combinedActivities, total: totalActivities });
  } catch (error) {
    console.error("Error fetching user activities:", error);
    res.status(500).json({ message: "Error fetching user activities" });
  }
});

module.exports = router;
