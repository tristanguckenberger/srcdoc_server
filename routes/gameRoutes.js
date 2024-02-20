const express = require("express");
const { query } = require("../config/db");
const Game = require("../models/Game");
const GameSession = require("../models/GameSession");
const Tag = require("../models/Tag");
const File = require("../models/File");
const { authenticate } = require("../middleware/auth");
const { placeholder } = require("../middleware/placeholder");
const router = express.Router();

// Create
router.post("/create", authenticate, placeholder, async (req, res, next) => {
  const userId = req?.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const {
    title = "New Game Title",
    description = "New Game Description",
    published = false,
  } = req.body;

  try {
    const result = await query(
      "INSERT INTO games (title, description, published, user_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [title, description, published, userId]
    );
    const createdGame = new Game(
      result.rows[0].id,
      result.rows[0].title,
      result.rows[0].description,
      result.rows[0].user_id
    );
    res.status(201).json(createdGame);
  } catch (error) {
    next(error);
  }
});

// Get All Games
router.get("/all", async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM games");
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get Single Game by Game ID
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query("SELECT * FROM games WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Game not found" });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get Games by User ID
router.get("/user/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await query("SELECT * FROM games WHERE user_id = $1", [
      userId,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No games found for this user" });
    }
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Update
router.put("/update/:id", authenticate, async (req, res, next) => {
  const { id } = req.params;
  const game = await Game.findById(id);

  if (!game) {
    return res.status(404).json({ message: `Game with ID: ${id} not found` });
  }

  const { title, description, published } = req.body;
  const userId = req?.user?.id;

  if (!userId || userId.toString() !== game.user_id.toString()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const result = await query(
      "UPDATE games SET title = $1, description = $2, published = $3 WHERE id = $4 RETURNING *",
      [title, description, published, id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete
router.delete("/delete/:id", authenticate, async (req, res, next) => {
  const { id } = req.params;
  const userId = req?.user?.id;
  const game = await Game.findById(id);

  if (!userId || userId.toString() !== game.user_id.toString()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!game) {
    try {
      await query("DELETE FROM files WHERE game_id = $1", [id]);
    } catch (error) {
      next(error);
    }
    return res.status(404).json({ message: `Game with ID: ${id} not found` });
  }

  try {
    // Delete the Game
    await query("DELETE FROM games WHERE id = $1", [id]);

    // Delete all files associated with this game
    await query("DELETE FROM files WHERE game_id = $1", [id]);

    res.status(200).json({ message: "Game deleted" });
  } catch (error) {
    next(error);
  }
});

// router.post("/saveToGitHub", async (req, res) => {
//   try {
//     const { gameId } = req.body;
//     const game = await getGameById(gameId); // Assuming you have this function
//     if (!game) {
//       return res.status(404).json({ message: "Game not found" });
//     }

//     const github = new Octokit({ auth: req.user.githubToken }); // Assuming GitHub token is stored in req.user
//     const gist = await github.gists.create({
//       files: {
//         "index.html": { content: game.htmlCode },
//         "styles.css": { content: game.cssCode },
//         "script.js": { content: game.jsCode },
//       },
//       description: game.name,
//       public: true,
//     });

//     return res.json({ gistUrl: gist.data.html_url });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "An error occurred" });
//   }
// });

// TAGS --------------------------------------------------------------------

// Add tags to a game
router.post("/:gameId/tags", authenticate, async (req, res) => {
  const { gameId } = req.params;
  const tags = req.body.tags; // This should be an array of tag names
  const game = await Game.findById(gameId);

  if (!game) {
    return res
      .status(404)
      .json({ message: "Tag must be associated with a game." });
  }

  const userId = req?.user?.id;
  const authorId = game.user_id;

  if (!userId || userId.toString() !== authorId.toString()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Add tags to Tags table if they don't exist
    // Note: You'll have to adapt this to your specific database library
    const tagIds = await Promise.all(
      tags.map(async (tagName) => {
        const [tag] = await query(
          "INSERT INTO tags (name) VALUES (?) ON DUPLICATE KEY UPDATE id=id",
          [tagName]
        );
        return tag.id;
      })
    );

    // Associate tags with the game in GameTags table
    await Promise.all(
      tagIds.map((tagId) => {
        return query("INSERT INTO game_tags (game_id, tag_id) VALUES (?, ?)", [
          gameId,
          tagId,
        ]);
      })
    );

    res.status(200).json({ message: "Tags added successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to add tags." });
  }
});

// Remove tags from a game
router.delete("/:gameId/tags", authenticate, async (req, res) => {
  const { gameId } = req.params;
  const tags = req.body.tags; // This should be an array of tag names

  const game = await Game.findById(gameId);

  if (!game) {
    return res
      .status(404)
      .json({ message: "Tag must be associated with a game." });
  }

  // Validate game ownership, etc.
  const userId = req?.user?.id;
  const authorId = game.user_id;

  if (!userId || userId.toString() !== authorId.toString()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Find tag IDs
    const tagIds = await query("SELECT id FROM tags WHERE name IN (?)", [tags]);

    // Remove associations from game_tags table
    await query("DELETE FROM game_tags WHERE game_id = ? AND tag_id IN (?)", [
      gameId,
      tagIds,
    ]);

    res.status(200).json({ message: "Tags removed successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove tags." });
  }
});

// Get tags for a game
router.get("/:gameId/tags", async (req, res) => {
  const { gameId } = req.params;

  try {
    const tags = Tag.findByGameId(gameId);

    res.status(200).json(tags);
  } catch (error) {
    res.status(500).json({ message: "Failed to get tags." });
  }
});

// Get games by tag
router.get("/tags/:tagId", async (req, res) => {
  const { tagId } = req.params;

  try {
    const games = Game.findByTagId(tagId);

    res.status(200).json(games);
  } catch (error) {
    res.status(500).json({ message: "Failed to get games." });
  }
});

// FILES -------------------------------------------------------------------

// get all files for a game
router.get("/:gameId/files", async (req, res, next) => {
  try {
    const { gameId } = req.params;
    if (!gameId) {
      return res.status(404).json({ message: "Please pass in a game ID" });
    }

    const game = await Game.findById(gameId);

    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    const files = await File.findByGameId(gameId);
    if (!files) {
      return res.status(404).json({ message: "No files found for this game" });
    }

    res.status(200).json(files);
  } catch (error) {
    next(error);
  }
});

// add a file to a game
router.post("/:gameId/files", authenticate, async (req, res, next) => {
  const { name, type, content, parentFileId } = req.body;
  const userId = req?.user?.id;

  const { gameId } = req.params;
  if (!gameId) {
    return res.status(401).json({ message: "Please provide a game id" });
  }

  const game = await Game.findById(gameId);
  if (!game) {
    return res.status(404).json({ message: "Game not found" });
  }

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!name) {
    return res.status(401).json({ message: "Please provide a file name" });
  }

  try {
    const result = await query(
      "INSERT INTO files (name, type, content, game_id, parent_file_id ) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, type, content, gameId, parentFileId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// update a file
router.put("/:gameId/files/:fileId", authenticate, async (req, res, next) => {
  const { gameId, fileId } = req.params;
  const userId = req?.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  console.log("fileId::", fileId);

  const file = await File.findById(fileId);

  if (!file) {
    console.log("file::NOT_FOUND");
    return res.status(404).json({ message: "File not found" });
  }

  const { name, type, content, parentFileId } = req.body;

  if (!gameId) {
    return res.status(401).json({ message: "Please provide a game id" });
  }

  const game = await Game.findById(gameId);
  if (!game) {
    return res.status(404).json({ message: "Game not found" });
  }

  if (!userId || userId.toString() !== game.user_id.toString()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const result = await query(
      "UPDATE files SET name = $1, type = $2, content = $3, parent_file_id = $4 WHERE id = $5",
      [
        name ?? file?.name,
        type ?? file?.type,
        content ?? file?.content,
        parentFileId ?? file?.parentFileId,
        fileId,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// batch update files
router.post("/:gameId/files/batch", authenticate, async (req, res, next) => {
  const { gameId } = req.params;
  const userId = req?.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!gameId) {
    return res.status(401).json({ message: "Please provide a game id" });
  }

  const game = await Game.findById(gameId);
  if (!game) {
    return res.status(404).json({ message: "Game not found" });
  }

  if (!userId || userId.toString() !== game.user_id.toString()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { files } = req.body;

  try {
    await Promise.all(
      files.map(async (file) => {
        const result = await query(
          "UPDATE files SET name = $1, type = $2, content = $3, parent_file_id = $4 WHERE id = $5",
          [file.name, file.type, file.content, file.parentFileId, file.fileId]
        );
        return result.rows[0];
      })
    );
    res.status(201).json({ message: "Files updated" });
  } catch (error) {
    next(error);
  }
});

// batch AND single file update
router.post(
  "/:gameId/files/batchAndSingle",
  authenticate,
  async (req, res, next) => {
    const { gameId } = req.params;
    const userId = req?.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!gameId) {
      return res.status(401).json({ message: "Please provide a game id" });
    }

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    if (!userId || userId.toString() !== game.user_id.toString()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { files, singleFile } = req.body;

    try {
      await Promise.all(
        files.map(async (file) => {
          const result = await query(
            "UPDATE files SET name = $1, type = $2, content = $3, parent_file_id = $4 WHERE id = $5",
            [file.name, file.type, file.content, file.parentFileId, file.fileId]
          );
          return result.rows[0];
        })
      );

      if (singleFile) {
        const { name, type, content, parentFileId } = singleFile;
        const result = await query(
          "UPDATE files SET name = $1, type = $2, content = $3, parent_file_id = $4 WHERE id = $5",
          [name, type, content, parentFileId, singleFile.fileId]
        );
        return result.rows[0];
      }

      res.status(201).json({ message: "Files updated" });
    } catch (error) {
      next(error);
    }
  }
);

// delete a file
router.delete(
  "/:gameId/files/:fileId",
  authenticate,
  async (req, res, next) => {
    const { gameId, fileId } = req.params;
    const userId = req?.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!gameId) {
      return res.status(401).json({ message: "Please provide a game id" });
    }

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    if (!userId || userId.toString() !== game.user_id.toString()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      await query("DELETE FROM files WHERE id = $1", [fileId]);
      res.status(200).json({ message: "File deleted" });
    } catch (error) {
      next(error);
    }
  }
);

// batch delete files
router.delete("/:gameId/files/batch", authenticate, async (req, res, next) => {
  const { gameId } = req.params;
  const userId = req?.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!gameId) {
    return res.status(401).json({ message: "Please provide a game id" });
  }

  const game = await Game.findById(gameId);
  if (!game) {
    return res.status(404).json({ message: "Game not found" });
  }

  if (!userId || userId.toString() !== game.user_id.toString()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { files } = req.body;

  try {
    await Promise.all(
      files.map(async (file) => {
        await query("DELETE FROM files WHERE id = $1", [file.fileId]);
      })
    );
    res.status(200).json({ message: "Files deleted" });
  } catch (error) {
    next(error);
  }
});

// batch AND single file delete
router.delete(
  "/:gameId/files/batchAndSingle",
  authenticate,
  async (req, res, next) => {
    const { gameId } = req.params;
    const userId = req?.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!gameId) {
      return res.status(401).json({ message: "Please provide a game id" });
    }

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    if (!userId || userId.toString() !== game.user_id.toString()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { files, singleFile } = req.body;

    try {
      await Promise.all(
        files.map(async (file) => {
          await query("DELETE FROM files WHERE id = $1", [file.fileId]);
        })
      );

      if (singleFile) {
        await query("DELETE FROM files WHERE id = $1", [singleFile.fileId]);
      }

      res.status(200).json({ message: "Files deleted" });
    } catch (error) {
      next(error);
    }
  }
);

// Game Sessions -----------------------------------------------------------

// CREATE
// Create a game session
router.post(
  "/:gameId/sessions/create",
  authenticate,
  async (req, res, next) => {
    const { gameId } = req.params;
    let userId = req?.user?.id;

    // if there's no user id, assign the session to a anonymous user (for now)
    if (!userId) {
      userId = `anonymous_${Math.random().toString(36).substr(2, 9)}`;
    }

    if (!gameId) {
      return res.status(401).json({ message: "Please provide a game id" });
    }

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    try {
      const result = await query(
        "INSERT INTO game_session (game_id, user_id) VALUES ($1, $2) RETURNING *",
        [gameId, userId]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

// READ

// Get all sessions
router.get("/sessions", async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM game_session");
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get all game sessions by user ID
router.get("/sessions/user/:userId", async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: "Please provide a user id" });
  }

  try {
    const result = await query(
      "SELECT * FROM game_session WHERE user_id = $1",
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No game sessions found" });
    }
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// UPDATE
// Update a game session
router.put("/sessions/:gameSessionId", authenticate, async (req, res, next) => {
  const { gameSessionId } = req.params;
  const userId = req?.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!gameSessionId) {
    return res
      .status(401)
      .json({ message: "Please provide a game session id" });
  }

  const gameSession = await GameSession.findByGameSessionId(gameSessionId);
  if (!gameSession) {
    return res.status(404).json({ message: "Game session not found" });
  }

  const {
    sessionTotalTime = gameSession?.sessionTotalTime,
    sessionTotalScore = gameSession?.sessionTotalScore,
  } = req.body;

  try {
    const result = await query(
      "UPDATE game_session SET user_id = $1, session_total_time = $2, session_total_score = $3, WHERE game_session_id = $4 RETURNING *",
      [userId, sessionTotalTime, sessionTotalScore, gameSessionId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get a single game session by session ID
router.get("/sessions/:gameSessionId", async (req, res, next) => {
  const { gameSessionId } = req.params;

  if (!gameSessionId) {
    return res
      .status(401)
      .json({ message: "Please provide a game session id" });
  }

  try {
    const result = await query(
      "SELECT * FROM game_session WHERE game_session_id = $1",
      [gameSessionId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Game session not found" });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get all game sessions by game ID
router.get("/:gameId/sessions", async (req, res, next) => {
  const { gameId } = req.params;

  if (!gameId) {
    return res.status(401).json({ message: "Please provide a game id" });
  }

  try {
    const result = await query(
      "SELECT * FROM game_session WHERE game_id = $1",
      [gameId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No game sessions found" });
    }
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// DELETE
// Delete a game session

// Game Session Activity ----------------------------------------------------

// CREATE
// Create a game session activity
router.post(
  "/sessions/:gameSessionId/activities/create",
  authenticate,
  async (req, res, next) => {
    const { gameSessionId } = req.params;
    const { action } = req.body;

    if (!gameSessionId) {
      return res
        .status(401)
        .json({ message: "Please provide a game session id" });
    }

    // Get the Game Session
    const gameSession = await GameSession.findByGameSessionId(gameSessionId);
    if (!gameSession) {
      return res.status(404).json({ message: "Game session not found" });
    }

    try {
      const result = await query(
        "INSERT INTO game_user_activity (game_session_id, action) VALUES ($1, $2) RETURNING *",
        [gameSessionId, action]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

// READ
// get an activity by activity id
router.get(
  "sessions/activities/:gameUserActivityId",
  async (req, res, next) => {
    const { gameUserActivityId } = req.params;

    if (!gameUserActivityId) {
      return res
        .status(401)
        .json({ message: "Please provide a game user activity id" });
    }

    try {
      const result = await query(
        "SELECT * FROM game_user_activity WHERE game_user_activity_id = $1",
        [gameUserActivityId]
      );
      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ message: "Game user activity not found" });
      }
      res.status(200).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

// get all activities by session id
router.get("/sessions/:gameSessionId/activities", async (req, res, next) => {
  const { gameSessionId } = req.params;

  if (!gameSessionId) {
    return res
      .status(401)
      .json({ message: "Please provide a game session id" });
  }

  try {
    const result = await query(
      "SELECT * FROM game_user_activity WHERE game_session_id = $1",
      [gameSessionId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No game user activities found" });
    }
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// get all activities
router.get("/sessions/activities", async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM game_user_activity");
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// get all activities by user id
router.get("/sessions/activities/user/:userId", async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: "Please provide a user id" });
  }

  try {
    const result = await query(
      `
        SELECT *
        FROM game_user_activity AS gua
        JOIN game_session AS gs ON gua.game_session_id = gs.game_session_id
        WHERE gs.user_id = $1
        `,
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No game user activities found" });
    }
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// get the current users activity
router.get(
  "/sessions/activities/current",
  authenticate,
  async (req, res, next) => {
    const userId = req?.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const result = await query(
        `
          SELECT *
          FROM game_user_activity AS gua
          JOIN game_session AS gs ON gua.game_session_id = gs.game_session_id
          WHERE gs.user_id = $1
        `,
        [userId]
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ message: "No game user activities found" });
      }
      res.status(200).json(result.rows);
    } catch (error) {
      next(error);
    }
  }
);

// get the current users activity by game id
router.get(
  "/sessions/activities/current/:gameId",
  authenticate,
  async (req, res, next) => {
    const userId = req?.user?.id;
    const { gameId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!gameId) {
      return res.status(401).json({ message: "Please provide a game id" });
    }

    try {
      const result = await query(
        `
          SELECT *
          FROM game_user_activity AS gua
          JOIN game_session AS gs ON gua.game_session_id = gs.game_session_id
          WHERE gs.user_id = $1 AND gs.game_id = $2
        `,
        [userId, gameId]
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ message: "No game user activities found" });
      }
      res.status(200).json(result.rows);
    } catch (error) {
      next(error);
    }
  }
);

// Algorithmic Endpoints ----------------------------------------------------

// get all time top played games
router.get("/topPlayed", async (req, res, next) => {
  try {
    const result = await query(
      `
        SELECT game_id, COUNT(game_id) AS play_count
        FROM game_session
        GROUP BY game_id
        ORDER BY play_count DESC
        LIMIT 10
      `
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// get all time top played games by user id
router.get("/topPlayed/user/:userId", async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: "Please provide a user id" });
  }

  try {
    const result = await query(
      `
        SELECT game_id, COUNT(game_id) AS play_count
        FROM game_session
        WHERE user_id = $1
        GROUP BY game_id
        ORDER BY play_count DESC
        LIMIT 10
      `,
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// get top trending games (top games in the last 30 days)
router.get("/topTrending/:timeFrame", async (req, res, next) => {
  const { timeFrame = 30 } = req.params;
  try {
    const result = await query(
      `
        SELECT game_id, COUNT(game_id) AS play_count
        FROM game_session
        WHERE created_at > NOW() - INTERVAL $1 DAY
        GROUP BY game_id
        ORDER BY play_count DESC
        LIMIT 10
      `,
      [timeFrame]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// get top trending games by user id (top games in the last 30 days)
router.get("/topTrending/user/:userId", async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: "Please provide a user id" });
  }

  try {
    const result = await query(
      `
        SELECT game_id, COUNT(game_id) AS play_count
        FROM game_session
        WHERE user_id = $1 AND created_at > NOW() - INTERVAL 30 DAY
        GROUP BY game_id
        ORDER BY play_count DESC
        LIMIT 10
      `,
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// get ranked list of sessions by game id, based on score
router.get("/:gameId/leaderboards", async (req, res, next) => {
  const { gameId } = req.params;

  if (!gameId) {
    return res.status(401).json({ message: "Please provide a game id" });
  }

  try {
    const result = await query(
      `
        SELECT game_session_id, user_id, session_total_score
        FROM game_session
        JOIN users ON game_session.user_id = users.id
        WHERE game_id = $1
        ORDER BY session_total_score DESC
      `,
      [gameId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// get all games and order by date `created_at` DESC
router.get("/new", async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM games ORDER BY created_at DESC");
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// get all games and order by date `updated_at` DESC
router.get("/recent", async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM games ORDER BY updated_at DESC");
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
