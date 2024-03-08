const express = require("express");
const { query } = require("../config/db");
const router = express.Router();

router.get("/basic", async (req, res, next) => {
  console.log("searching for basic");
  const searchQuery = req.query.q;

  if (!searchQuery) {
    return res.status(400).send("Search query is required");
  }

  try {
    const { rows } = await query(
      `(SELECT 'games' AS type, id, title, description FROM games WHERE tsv @@ plainto_tsquery($1))
                    UNION ALL
                    (SELECT 'playlist' AS type, id, name, description FROM playlist WHERE tsv @@ plainto_tsquery($1))
                    UNION ALL
                    (SELECT 'users' AS type, id, username, bio AS description FROM users WHERE tsv @@ plainto_tsquery($1))
                    UNION ALL
                    (SELECT 'comments' AS type, id, 'Comment' AS name, comment_text AS description FROM comments WHERE tsv @@ plainto_tsquery($1))
                    ORDER BY type;`,
      [searchQuery]
    );

    const enhancedRows = await Promise.all(
      rows.map(async (row) => {
        if (row.type === "games") {
          const gameData = await query(
            `SELECT thumbnail, user_id FROM games WHERE id = $1`,
            [row.id]
          );
          const userData = await query(
            `SELECT username, profile_photo FROM users WHERE id = $1`,
            [gameData.rows[0].user_id]
          );
          return {
            ...row,
            thumbnail: gameData.rows[0].thumbnail,
            username: userData.rows[0].username,
            user_photo: userData.rows[0].profile_photo,
          };
        } else if (row.type === "playlist") {
          const playlistData = await query(
            `SELECT is_public, is_category, owner_id FROM playlist WHERE id = $1`,
            [row.id]
          );
          const userData = await query(
            `SELECT username FROM users WHERE id = $1`,
            [playlistData.rows[0].owner_id]
          );
          return {
            ...row,
            is_public: playlistData.rows[0].is_public,
            is_category: playlistData.rows[0].is_category,
            username: userData.rows[0].username,
          };
        } else if (row.type === "comments") {
          const userData = await query(
            `SELECT username FROM users WHERE id = $1`,
            [row.user_id]
          );
          const gameData = await query(
            `SELECT title FROM games WHERE id = $1`,
            [row.game_id]
          );
          const replyData = await query(
            `SELECT * FROM comments WHERE parent_id = $1`,
            [row.id]
          );
          return {
            ...row,
            username: userData.rows[0].username,
            game_title: gameData.rows[0].title,
            replies: replyData.rows,
          };
        }
      })
    );

    res.status(200).json(enhancedRows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
