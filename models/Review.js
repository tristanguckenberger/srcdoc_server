const { query } = require("../config/db");

class Review {
  constructor(id, userId, gameId, rating, reviewText) {
    this.id = id;
    this.userId = userId;
    this.gameId = gameId;
    this.rating = rating;
    this.reviewText = reviewText;
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
}

module.exports = Review;
