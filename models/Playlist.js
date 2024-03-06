const { query } = require("../config/db");

class Playlist {
  constructor(
    id,
    ownerId,
    name,
    description,
    userId,
    isPublic,
    isCategory,
    createdAt,
    updatedAt
  ) {
    this.id = id;
    this.ownerId = ownerId;
    this.name = name;
    this.description = description;
    this.userId = userId;
    this.isPublic = isPublic;
    this.isCategory = isCategory;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  //   static async findById(id) {
  //     try {
  //       const playlist = await query(
  //         `SELECT * FROM playlist JOIN game_playlist ON playlist.id = game_playlist.playlist_id WHERE id = $1`,
  //         [id]

  //         );

  //         // get all games for a playlist

  //       return playlist.rows[0];
  //     } catch (error) {
  //       console.error("Error fetching game by id:", error);
  //       return null;
  //     }
  //   }

  // static async findAllGamesByPlaylistId(playlistId) {
  //     try {
  //         const games = await query(`
  //             SELECT games.id AS game_id, games.name AS game_name, games.description AS game_description,
  //             games.is_public AS game_is_public, games.is_category AS game_is_category,
  //             playlist.id AS playlist_id, playlist.owner_id AS playlist_owner_id,
  //             playlist.name AS playlist_name, playlist.description AS playlist_description,
  //             playlist.user_id AS playlist_user_id, playlist.is_public AS playlist_is_public,
  //             playlist.is_category AS playlist_is_category, playlist.created_at AS playlist_created_at,
  //             playlist.updated_at AS playlist_updated_at
  //             FROM games
  //             JOIN game_playlist ON games.id = game_playlist.game_id
  //             JOIN playlist ON playlist.id = game_playlist.playlist_id
  //             WHERE playlist.id = $1
  //         `, [playlistId]);

  //         return games.rows;
  //     } catch (error) {
  //         console.error("Error fetching games by playlist id:", error);
  //         return null;
  //     }
  // }

  static async findById(id) {
    try {
      const playlist = await query(
        `SELECT playlist.*, users.username AS ownername FROM playlist JOIN users ON playlist.owner_id = users.id WHERE id = $1`,
        [id]
      );
      return playlist.rows[0];
    } catch (error) {
      console.error("Error fetching playlist by id:", error);
      return null;
    }
  }

  static async getAllGamesForSinglePlaylist(playlistId, next) {
    try {
      const games = await query(
        `SELECT playlist.id, playlist.owner_id, users.username AS ownername, playlist.name, playlist.description, playlist.is_public, playlist.is_category, playlist.created_at, playlist.updated_at FROM playlist JOIN users ON playlist.owner_id = users.id WHERE playlist.id = $1`,
        [playlistId]
      );
      return games.rows[0];
    } catch (error) {
      next(error);
    }
  }

  static async getAllPlaylistsForSingleUser(userId, next) {
    try {
      const playlists = await query(
        `SELECT playlist.*, users.username FROM playlist JOIN users ON playlist.owner_id = users.id WHERE owner_id = $1`,
        [userId]
      );
      return playlists.rows;
    } catch (error) {
      next(error);
    }
  }

  // get all playlists for a user
  //   static async findByUserId(userId) {
  //     try {
  //       const games = await query("SELECT * FROM playlist WHERE user_id = $1", [
  //         userId,
  //       ]);
  //       return games.rows;
  //     } catch (error) {
  //       console.error("Error fetching games by user id:", error);
  //       return null;
  //     }
  //   }

  //   // get all games by tag name or id
  //   static async findByTagId(tagId) {
  //     try {
  //       const games = await query(
  //         "SELECT * FROM games JOIN game_tags ON games.id = game_tags.game_id WHERE game_tags.tag_id = $1",
  //         [tagId]
  //       );
  //       return games.rows;
  //     } catch (error) {
  //       console.error("Error fetching games by tag id:", error);
  //       return null;
  //     }
  //   }
}

module.exports = Playlist;
