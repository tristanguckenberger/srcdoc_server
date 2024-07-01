const express = require("express");
const { query } = require("../config/db");
const Playlist = require("../models/Playlist");
const { authenticate } = require("../middleware/auth");
const router = express.Router();
const multer = require("multer");

// Set up multer with memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// CREATE ENDPOINTS -------------------------------------------------
// Create a new playlist
router.post("/create", authenticate, async (req, res, next) => {
  const ownerId = req?.user?.id;
  const { name, description, isPublic } = req.body;
  const isCategory = false;

  if (!ownerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const newPlaylist = await query(
      `INSERT INTO playlist (owner_id, name, description, is_public, is_category) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [ownerId, name, description, isPublic, isCategory]
    );

    const playlistId = newPlaylist.rows[0].id;

    await query(
      `INSERT INTO user_playlist (playlist_id, user_id) VALUES ($1, $2) RETURNING *`,
      [playlistId, ownerId]
    );

    res.status(201).json(newPlaylist.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Create a new playlist from an existing playlist
router.post("/create/:playlistId", authenticate, async (req, res, next) => {
  const ownerId = req?.user?.id;
  const playlistId = req.params.playlistId;
  const { name, description, isPublic } = req.body;
  const isCategory = false;

  if (!ownerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const newPlaylist = await query(
      `INSERT INTO playlist (owner_id, name, description, is_public, is_category) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [ownerId, name, description, isPublic, isCategory]
    );
    const newPlaylistId = newPlaylist.rows[0].id;

    const games = await Playlist.getAllGamesForSinglePlaylist(playlistId, next);
    for (let i = 0; i < games.length; i++) {
      await query(
        `INSERT INTO game_playlist (playlist_id, game_id) VALUES ($1, $2) RETURNING *`,
        [newPlaylistId, games[i].id]
      );
    }

    await query(
      `INSERT INTO user_playlist (playlist_id, user_id) VALUES ($1, $2) RETURNING *`,
      [newPlaylistId, ownerId]
    );

    res.status(201).json(newPlaylist.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Add a game to a playlist (game_playlist)
router.post(
  "/:playlistId/add/:gameId",
  authenticate,
  async (req, res, next) => {
    const playlistId = req.params.playlistId;
    const gameId = req.params.gameId;

    if (!playlistId || !gameId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    if (!playlist.is_public) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (playlist.owner_id !== req?.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // check if game is already in playlist
    const gameExists = await query(
      `SELECT * FROM game_playlist WHERE playlist_id = $1 AND game_id = $2`,
      [playlistId, gameId]
    );

    if (gameExists.rows.length > 0) {
      return res.status(400).json({ error: "Game already exists in playlist" });
    }

    try {
      const newGamePlaylist = await query(
        `INSERT INTO game_playlist (playlist_id, game_id) VALUES ($1, $2) RETURNING *`,
        [playlistId, gameId]
      );
      res.status(201).json(newGamePlaylist.rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

// Add a playlist to a users library
router.post("/:playlistId/add", authenticate, async (req, res, next) => {
  const playlistId = req.params.playlistId;
  const userId = req?.user?.id;

  if (!playlistId || !userId) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const playlist = await Playlist.findById(playlistId);

  if (
    playlist.owner_id?.toString() !== userId?.toString() &&
    !playlist.is_public
  ) {
    return res.status(401).json({ error: "Private Playlist: Unauthorized" });
  }

  // check if playlist exists for the user already
  const playlistExists = await query(
    `SELECT * FROM user_playlist WHERE playlist_id = $1 AND user_id = $2`,
    [playlistId, userId]
  );

  if (playlistExists.rows.length > 0) {
    return res
      .status(400)
      .json({ error: "Playlist already exists in library" });
  }

  try {
    const newPlaylistLibrary = await query(
      `INSERT INTO user_playlist (playlist_id, user_id) VALUES ($1, $2) RETURNING *`,
      [playlistId, userId]
    );
    res.status(201).json(newPlaylistLibrary.rows[0]);
  } catch (error) {
    next(error);
  }
});

// READ ENDPOINTS -------------------------------------------------
// Get a single playlist by its id
router.get("/:playlistId", async (req, res, next) => {
  const playlistId = req.params.playlistId;
  const user = req?.user;

  if (!playlistId) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    const games = await Playlist.getSinglePlaylist(playlistId, next, user?.id);

    res.status(200).json(games);
  } catch (error) {
    next(error);
  }
});

// Get all playlists for a user
router.get("/user/:userId", async (req, res, next) => {
  const userId = req.params.userId;

  if (!userId) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    const playlists = await Playlist.getAllPlaylistsForSingleUser(userId, next);

    res.status(200).json(playlists);
  } catch (error) {
    next(error);
  }
});

// Get all playlists in a users library (user_playlist)
router.get("/get/library", authenticate, async (req, res, next) => {
  const userId = req?.user?.id;

  if (!userId) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    const playlists = await Playlist.getAllPlaylistsInLibrary(userId, next);
    res.status(200).json(playlists);
  } catch (error) {
    next(error);
  }
});

// Get all playlists where isCategory is true
router.get("/categories/all", async (req, res, next) => {
  try {
    const categories = await Playlist.getAllCategories(next);
    res.status(200).json(categories);
  } catch (error) {
    next(error);
  }
});

// Get all games for a playlist
router.get("/:playlistId/games", async (req, res, next) => {
  const playlistId = req.params.playlistId;

  if (!playlistId) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    const games = await Playlist.getAllGamesForSinglePlaylist(playlistId, next);
    const playlist = await Playlist.getSinglePlaylist(playlistId, next);

    res.status(200).json({ ...playlist, games });
  } catch (error) {
    next(error);
  }
});

// UPDATE ENDPOINTS -------------------------------------------------
// Update a playlist
// Update a playlist and optionally update the order of items in it
router.put(
  "/:playlistId",
  authenticate,
  upload.single("thumbnail"),
  async (req, res, next) => {
    const playlistId = req.params.playlistId;
    const ownerId = req?.user?.id;

    if (!playlistId || !ownerId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist || playlist.owner_id !== ownerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      name = playlist.name ?? "",
      description = playlist?.description ?? "",
      isPublic = playlist?.isPublic ?? true,
      gamesOrder,
      thumbnail = playlist?.thumbnail,
    } = req.body; // Added gamesOrder to the destructured parameters

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
      // Handle non-order-related updates first
      // if (!isPublic) {
      //   await query(`DELETE FROM user_playlist WHERE playlist_id = $1`, [
      //     playlistId,
      //   ]);
      // }

      const updatedPlaylist = await query(
        `UPDATE playlist SET name = $1, description = $2, is_public = $3, thumbnail = $4 WHERE id = $5 AND owner_id = $6 RETURNING *`,
        [
          name,
          description,
          isPublic,
          base64Str ?? thumbnail,
          playlistId,
          ownerId,
        ]
      );

      // Now, handle the order update if gamesOrder is provided
      if (Array.isArray(gamesOrder) && gamesOrder.length > 0) {
        // Begin a transaction to ensure atomicity
        await query("BEGIN");

        for (let i = 0; i < gamesOrder.length; i++) {
          await query(
            `UPDATE game_playlist SET item_order = $1 WHERE playlist_id = $2 AND game_id = $3`,
            [i + 1, playlistId, gamesOrder[i]] // Set the order based on the array index + 1 for SQL indexing
          );
        }

        await query("COMMIT"); // Commit the transaction if all updates succeed
      }

      res.status(200).json(updatedPlaylist.rows[0]);
    } catch (error) {
      await query("ROLLBACK"); // Roll back the transaction in case of error
      next(error);
    }
  }
);

// DELETE ENDPOINTS -------------------------------------------------
// Remove a game from a playlist (game_playlist)
router.delete(
  "/:playlistId/remove/:gameId",
  authenticate,
  async (req, res, next) => {
    const playlistId = req.params.playlistId;
    const gameId = req.params.gameId;
    const potentialOwnerId = req?.user?.id;

    if (!playlistId || !gameId || !potentialOwnerId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    if (playlist.owner_id !== potentialOwnerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      await query(
        `DELETE FROM game_playlist WHERE playlist_id = $1 AND game_id = $2`,
        [playlistId, gameId]
      );
      res.status(200).json({ message: "Game removed from playlist" });
    } catch (error) {
      next(error);
    }
  }
);
// Remove a playlist from a users library
router.delete("/:playlistId/remove", authenticate, async (req, res, next) => {
  const playlistId = req.params.playlistId;
  const userId = req?.user?.id;

  if (!playlistId || !userId) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    await query(
      `DELETE FROM user_playlist WHERE playlist_id = $1 AND user_id = $2`,
      [playlistId, userId]
    );
    res.status(200).json({ message: "Playlist removed from library" });
  } catch (error) {
    next(error);
  }
});
// Delete a single playlist
router.delete("/:playlistId", authenticate, async (req, res, next) => {
  const playlistId = req.params.playlistId;
  const ownerId = req?.user?.id;

  if (!playlistId || !ownerId) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist || playlist.owner_id !== ownerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await query(`DELETE FROM playlist WHERE id = $1`, [playlistId]);
    res.status(200).json({ message: "Playlist deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
