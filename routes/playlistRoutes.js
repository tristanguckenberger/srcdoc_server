const express = require("express");
const { query } = require("../config/db");
const Playlist = require("../models/Playlist");
const { authenticate } = require("../middleware/auth");
const { placeholder } = require("../middleware/placeholder");
const router = express.Router();

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

// Get all games for a playlist
router.get("/:playlistId", async (req, res, next) => {
  const playlistId = req.params.playlistId;

  if (!playlistId) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    const games = await Playlist.getAllGamesForSinglePlaylist(playlistId);

    res.status(200).json(games);
  } catch (error) {
    next(error);
  }
});

// Get all playlists for a user
router.get("/user/:userId", async (req, res, next) => {
  const userId = req.params.userId;

  console.log("userId::", userId);

  if (!userId) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    const playlists = await Playlist.getAllPlaylistsForSingleUser(userId, next);

    console.log("playlists::", playlists);

    res.status(200).json(playlists);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
