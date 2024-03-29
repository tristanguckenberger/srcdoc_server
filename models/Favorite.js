const { query } = require("../config/db");

class Favorite {
  constructor(id, userId, gameId) {
    this.id = id;
    this.userId = userId;
    this.gameId = gameId;
  }

  static async findById(id) {
    try {
      const favorite = await query("SELECT * FROM favorites WHERE id = $1", [
        id,
      ]);
      return favorite.rows[0];
    } catch (error) {
      console.error("Error fetching favorite by id:", error);
      return null;
    }
  }

  // find by game AND user id
  static async findByGameAndUserId(gameId, userId) {
    try {
      const favorite = await query(
        "SELECT * FROM favorites WHERE game_id = $1 AND user_id = $2",
        [gameId, userId]
      );
      return favorite.rows[0];
    } catch (error) {
      console.error("Error fetching favorite by game and user id:", error);
      return null;
    }
  }
}

module.exports = Favorite;
