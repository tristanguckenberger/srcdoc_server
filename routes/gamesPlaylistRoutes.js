const express = require("express");
const { query } = require("../config/db");
const { authenticate } = require("../middleware/auth");
const router = express.Router();

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

// Update the order of games in a playlist
// router.put(
//   "/:playlistId/update",
//   authenticate,
//   async (req, res, next) => {
//     const playlistId = req.params.playlistId;
//     const gameIds = req.body.gameIds;

//     if (!playlistId || !gameIds) {
//       return res.status(400).json({ error: "Invalid request" });
//     }

//     try {
//       const updatedGamePlaylist = await query(
//         `UPDATE game_playlist SET order_id = idx FROM (SELECT unnest($2::int[]) WITH ORDINALITY AS t(id, idx) WHERE id IS NOT NULL) AS x WHERE game_id = x.id AND playlist_id = $1`,
//         [playlistId, gameIds]
//       );
//       res.status(200).json(updatedGamePlaylist.rows);
//     } catch (error) {
//       next(error);
//     }
//   }
// );
