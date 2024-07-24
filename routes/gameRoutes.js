const express = require("express");
const { query } = require("../config/db");
const Game = require("../models/Game");
const GameSession = require("../models/GameSession");
const Leaderboards = require("../models/Leaderboards");
const Tag = require("../models/Tag");
const File = require("../models/File");
const { authenticate } = require("../middleware/auth");
const { bypassableAuthenticate } = require("../middleware/bypassableAuth");
const { logActivity } = require("../middleware/activity");
const { publishGameCheck } = require("../middleware/publish");
const { placeholder } = require("../middleware/placeholder");
const router = express.Router();
const multer = require("multer");

const getGameActivityData = async (req, res) => {
  const { id } = req.params;
  const userId = req?.user?.id;

  return {
    user_id: userId,
    target_id: id,
    primary_text: "published a game",
    activity_type: "passive",
    target_type: "game",
  };
};

// Set up multer with memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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

// Get each Game Id & Updated At
router.get("/allIds", async (req, res, next) => {
  try {
    const result = await query(
      "SELECT games.id, games.updated_at FROM games WHERE published = true"
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get All Games with Cursor-based Pagination
router.get("/all", async (req, res, next) => {
  // The cursor passed from the client, defaulting to 0 if not provided
  const cursor = parseInt(req.query.cursor) || 0;

  // The number of games to fetch, defaulting to a predefined limit if not provided
  const limit = parseInt(req.query.limit) || 10;

  try {
    // Select games where the ID is greater than the cursor
    // Order by ID to ensure consistent results
    // Limit the number of results to the specified limit
    const queryText = `
      SELECT games.*, favorites.user_id, favorites.timestamp
        FROM games
        JOIN favorites ON games.id = favorites.game_id
        WHERE games.id > $1 AND games.published = true
        ORDER BY games.id ASC
        LIMIT $2
    `;

    const result = await query(queryText, [cursor, limit]);

    // Respond with the fetched games and the new cursor
    // The new cursor will be the ID of the last game in the result set
    const newCursor =
      result.rows.length > 0 ? result.rows[result.rows.length - 1].id : cursor;

    res.status(200).json({
      games: result.rows,
      nextCursor: newCursor,
    });
  } catch (error) {
    next(error);
  }
});

// Get all games with offset-based pagination
router.get("/paginated", bypassableAuthenticate, async (req, res, next) => {
  if (res.headersSent) {
    return;
  }
  const limit = parseInt(req.query.limit, 10) || 50; // Default limit to 50 games
  const offset = parseInt(req.query.offset, 10) || 0;
  const currentUser = req?.user?.id;

  const fetchGames = async (limit, offset) => {
    return await query(
      `SELECT 
        * FROM games 
        WHERE published = true 
        OR user_id = $1
        ORDER BY id DESC 
        LIMIT $2 OFFSET $3`,
      [currentUser, limit, offset]
    );
  };
  const fetchAssociatedData = async (games) => {
    const userIds = games.map((g) => g.user_id);
    const gameIds = games.map((g) => g.id);

    const users = await query(
      `SELECT users.id, users.username, users.profile_photo FROM users WHERE id = ANY($1::int[])`,
      [userIds]
    );

    const tags = await query(
      `SELECT * FROM tags WHERE id = ANY(SELECT tag_id FROM game_tags WHERE game_id = ANY($1::int[]))`,
      [gameIds]
    );

    const files = await query(
      `SELECT * FROM files WHERE game_id = ANY($1::int[])`,
      [gameIds]
    );

    const favorites = await query(
      `SELECT * FROM favorites WHERE game_id = ANY($1::int[])`,
      [gameIds]
    );

    return {
      users: users.rows,
      tags: tags.rows,
      files: files.rows,
      favorites: favorites.rows,
    };
  };

  try {
    if (res.headersSent) {
      return;
    }

    const totalGamesResult = await query(
      `SELECT COUNT(*) AS total FROM games WHERE published = true OR user_id = $1`,
      [currentUser]
    );

    if (res.headersSent) {
      return;
    }

    const totalGames = totalGamesResult.rows[0].total;
    if (res.headersSent) {
      return;
    }
    const gamesResult = await fetchGames(limit, offset);
    if (res.headersSent) {
      return;
    }

    const games = gamesResult.rows;
    if (res.headersSent) {
      return;
    }

    const associatedData = await fetchAssociatedData(games);
    if (res.headersSent) {
      return;
    }

    if (res.headersSent) {
      return;
    }

    // Combine data
    const combinedGames = games.map((game) => {
      const associatedUser = associatedData.users.find(
        (u) => u.id === game.user_id
      );
      const associatedTags = associatedData.tags.filter(
        (t) => t.id === game.id
      );
      const associatedFiles = associatedData.files.filter(
        (f) => f.game_id === game.id
      );
      const associatedFavorites = associatedData.favorites.filter(
        (f) => f.game_id === game.id
      );

      return {
        ...game,
        user: associatedUser,
        tags: associatedTags,
        files: associatedFiles,
        favorites: associatedFavorites,
      };
    });

    // Check if response is already sent
    if (res.headersSent) {
      return;
    }

    res.status(200).json({ games: combinedGames, total: totalGames });
  } catch (error) {
    console.error("Error fetching games and associated data", error);
  }
});

router.get("/slider", bypassableAuthenticate, async (req, res, next) => {
  const limit = parseInt(req.query.limit, 10) || 5; // Default limit to 5 games
  const currentGame = parseInt(req.query.currentGame, 10);
  const currentUser = req?.user?.id;

  if (!currentGame) {
    return res
      .status(400)
      .json({ message: "Please provide a current game ID" });
  }

  const game = await Game.findById(currentGame);
  if (!game) {
    return res.status(404).json({ message: "Game not found" });
  }

  const fetchGameById = async (id) => {
    return await query(
      `SELECT * FROM games WHERE published = true AND id = $1`,
      [id]
    );
  };

  const fetchAllGameIds = async () => {
    return await query(
      `SELECT id FROM games WHERE published = true OR user_id = $1 ORDER BY id ASC`,
      [currentUser]
    );
  };

  const fetchGamesByIds = async (ids) => {
    return await query(
      `SELECT * FROM games WHERE id = ANY($1::int[]) AND published = true OR user_id = $2 ORDER BY id ASC`,
      [ids, currentUser]
    );
  };

  const fetchGamesAround = async (currentGame, limit) => {
    const halfLimit = Math.floor(limit / 2);

    // Fetch all game IDs
    const allGamesResult = await fetchAllGameIds();
    const allGameIds = allGamesResult.rows.map((row) => row.id);

    // Find the index of the current game
    const currentIndex = allGameIds.indexOf(currentGame);

    if (currentIndex === -1) {
      return [];
    }

    // Calculate the indices for the range
    const totalGames = allGameIds.length;
    let startIndices = [];
    let endIndices = [];

    for (let i = 1; i <= halfLimit; i++) {
      startIndices.push(
        allGameIds[(currentIndex - i + totalGames) % totalGames]
      );
      endIndices.push(allGameIds[(currentIndex + i) % totalGames]);
    }

    const gameIds = [...startIndices.reverse(), currentGame, ...endIndices];

    // Fetch the games by IDs
    const gamesResult = await fetchGamesByIds(gameIds);
    return gamesResult.rows;
  };

  const fetchAssociatedData = async (games) => {
    const userIds = games.map((g) => g.user_id);
    const gameIds = games.map((g) => g.id);

    const users = await query(
      `SELECT users.id, users.username, users.profile_photo FROM users WHERE id = ANY($1::int[])`,
      [userIds]
    );

    const tags = await query(
      `SELECT * FROM tags WHERE id = ANY(SELECT tag_id FROM game_tags WHERE game_id = ANY($1::int[]))`,
      [gameIds]
    );

    const files = await query(
      `SELECT * FROM files WHERE game_id = ANY($1::int[])`,
      [gameIds]
    );

    const favorites = await query(
      `SELECT * FROM favorites WHERE game_id = ANY($1::int[])`,
      [gameIds]
    );

    return {
      users: users.rows,
      tags: tags.rows,
      files: files.rows,
      favorites: favorites.rows,
    };
  };

  try {
    const totalGamesResult = await query(
      `SELECT COUNT(*) AS total FROM games WHERE published = true OR user_id = $1`,
      [currentUser]
    );

    const totalGames = totalGamesResult.rows[0].total;
    const games = await fetchGamesAround(currentGame, limit);
    const associatedData = await fetchAssociatedData(games);

    // Combine data
    const combinedGames = games.map((game) => {
      const associatedUser = associatedData.users.find(
        (u) => u.id === game.user_id
      );
      const associatedTags = associatedData.tags.filter(
        (t) => t.id === game.id
      );
      const associatedFiles = associatedData.files.filter(
        (f) => f.game_id === game.id
      );
      const associatedFavorites = associatedData.favorites.filter(
        (f) => f.game_id === game.id
      );

      return {
        ...game,
        user: associatedUser,
        tags: associatedTags,
        files: associatedFiles,
        favorites: associatedFavorites,
      };
    });

    function centerTarget(arr, target) {
      const targetIndex = arr.findIndex((item) => item.id === target);

      if (targetIndex === -1) {
        throw new Error("Target not found in the array");
      }

      const result = [];
      const len = arr.length;

      // Add elements before the target
      for (let i = 0; i < 2; i++) {
        result.push(arr[(targetIndex - 2 + i + len) % len]);
      }

      // Add the target element
      result.push(arr[targetIndex]);

      // Add elements after the target
      for (let i = 1; i <= 2; i++) {
        result.push(arr[(targetIndex + i) % len]);
      }

      return result;
    }

    const centeredGames = centerTarget(combinedGames, currentGame);

    res.status(200).json({ games: centeredGames, total: totalGames });
  } catch (error) {
    console.error("Error fetching games and associated data", error);
    res.status(500).json({ message: "Internal server error" });
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
router.put(
  "/update/:id",
  authenticate,
  upload.single("thumbnail"),
  // call publishGameCheck
  publishGameCheck,
  async (req, res, next) => {
    const { id } = req.params;
    const game = await Game.findById(id);
    const canPublish = req?.canPublish;

    if (!game) {
      return res.status(404).json({ message: `Game with ID: ${id} not found` });
    }

    let {
      title = game.title,
      description = game.description,
      published = game.published,
      thumbnail = game.thumbnail,
    } = req.body;

    if (!canPublish) {
      published = false;
    }

    const userId = req?.user?.id;

    if (!userId || userId.toString() !== game.user_id.toString()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let base64;
    let base64Str;
    if (req.file) {
      const fileBuffer = req.file.buffer;
      base64 = fileBuffer.toString("base64");
      // need to append data:image/<ending>;base64, where ending is the file type
      const fileType = req.file.mimetype.split("/")[1];
      base64Str = `data:image/${fileType};base64,${base64}`;
    }

    try {
      await logActivity(getGameActivityData)(req, res, async () => {
        const result = await query(
          "UPDATE games SET title = $1, description = $2, thumbnail = $3, published = $4 WHERE id = $5 RETURNING *",
          [title, description, base64Str ?? thumbnail, published, id]
        );
        res.status(201).json(result.rows[0]);
      });
    } catch (error) {
      next(error);
    }
  }
);

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

  const file = await File.findById(fileId);

  if (!file) {
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

// Game Leaderboards -------------------------------------------------------
// get ranked list of sessions by game id, based on score
router.get("/:gameId/leaderboards", async (req, res, next) => {
  const { gameId } = req.params;

  if (!gameId) {
    return res.status(401).json({ message: "Please provide a game id" });
  }

  try {
    const result = await Leaderboards.getAllRowsByGameId(gameId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
