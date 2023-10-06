const { query } = require("../config/db");

class Comment {
  constructor(id, userId, gameId, parentCommentId, commentText) {
    this.id = id;
    this.userId = userId;
    this.gameId = gameId;
    this.parentCommentId = parentCommentId;
    this.commentText = commentText;
  }

  static async findById(id) {
    try {
      const comment = await query("SELECT * FROM comments WHERE id = $1", [id]);
      return comment.rows[0];
    } catch (error) {
      console.error("Error fetching comment by id:", error);
      return null;
    }
  }
}

module.exports = Comment;
