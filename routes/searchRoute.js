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

    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
