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

  static async findById(id) {
    try {
      const playlist = await query(
        `SELECT playlist.*, users.username AS ownername FROM playlist JOIN users ON playlist.owner_id = users.id WHERE playlist.id = $1`,
        [id]
      );
      return playlist.rows[0];
    } catch (error) {
      console.error("Error fetching playlist by id:", error);
      return null;
    }
  }

  static async getSinglePlaylist(playlistId, next) {
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

  static async getAllPlaylistsInLibrary(userId, next) {
    try {
      const playlists = await query(
        `SELECT playlist.id, playlist.owner_id, playlist.name, playlist.description, playlist.is_public, playlist.is_category, playlist.created_at, playlist.updated_at FROM playlist JOIN user_playlist ON playlist.id = user_playlist.playlist_id WHERE user_id = $1`,
        [userId]
      );

      const updatedPlaylists = await Promise.all(
        playlists.rows.map(async (playlist) => {
          const owner = await query(
            `SELECT username FROM users WHERE id = $1`,
            [playlist.owner_id]
          );
          playlist.username = owner.rows[0].username;
          return playlist;
        })
      );

      return updatedPlaylists;
    } catch (error) {
      next(error);
    }
  }

  static async getAllGamesForSinglePlaylist(playlistId, next) {
    try {
      const games = await query(
        `SELECT games.id, games.title, games.description, games.published, games.thumbnail, games.user_id, games.created_at, games.updated_at, COUNT(game_session.game_session_id) AS play_count FROM games JOIN game_playlist ON games.id = game_playlist.game_id LEFT JOIN game_session ON games.id = game_session.game_id WHERE game_playlist.playlist_id = $1 GROUP BY games.id`,
        [playlistId]
      );
      const updatedGames = await Promise.all(
        games.rows.map(async (game) => {
          const user = await query(`SELECT username FROM users WHERE id = $1`, [
            game.user_id,
          ]);
          game.username = user.rows[0].username;
          return game;
        })
      );
      return updatedGames;
    } catch (error) {
      next(error);
    }
  }
}

module.exports = Playlist;
