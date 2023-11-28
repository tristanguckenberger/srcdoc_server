const { query } = require("../config/db");

class Game {
  constructor(id, title, description, userId, published, createdAt, updatedAt) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.userId = userId;
    this.published = published;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static async findById(id) {
    try {
      const game = await query("SELECT * FROM games WHERE id = $1", [id]);
      return game.rows[0];
    } catch (error) {
      console.error("Error fetching game by id:", error);
      return null;
    }
  }

  // get all games for a user
  static async findByUserId(userId) {
    try {
      const games = await query("SELECT * FROM games WHERE user_id = $1", [
        userId,
      ]);
      return games.rows;
    } catch (error) {
      console.error("Error fetching games by user id:", error);
      return null;
    }
  }

  // get all games by tag name or id
  static async findByTagId(tagId) {
    try {
      const games = await query(
        "SELECT * FROM games JOIN game_tags ON games.id = game_tags.game_id WHERE game_tags.tag_id = $1",
        [tagId]
      );
      return games.rows;
    } catch (error) {
      console.error("Error fetching games by tag id:", error);
      return null;
    }
  }
}

module.exports = Game;
