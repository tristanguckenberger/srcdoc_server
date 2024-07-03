const { query } = require("../config/db");

class Review {
  constructor(
    id,
    userId,
    gameId,
    rating,
    difficulty,
    title,
    body,
    recommended
  ) {
    this.id = id;
    this.userId = userId;
    this.gameId = gameId;
    this.rating = rating;
    this.difficulty = difficulty;
    this.title = title;
    this.body = body;
    this.recommended = recommended;
  }

  static async findById(id) {
    try {
      const review = await query("SELECT * FROM reviews WHERE id = $1", [id]);
      return review.rows[0];
    } catch (error) {
      console.error("Error fetching review by id:", error);
      return null;
    }
  }

  static async findByUserAndGame(userId, gameId) {
    try {
      const review = await query(
        "SELECT * FROM reviews WHERE user_id = $1 AND game_id = $2",
        [userId, gameId]
      );
      return review.rows[0];
    } catch (error) {
      console.error("Error fetching review by user and game:", error);
      return null;
    }
  }
}

module.exports = Review;
