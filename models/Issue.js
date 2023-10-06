const { query } = require("../config/db");

class Issue {
  constructor(id, userId, gameId, issueText) {
    this.id = id;
    this.userId = userId;
    this.gameId = gameId;
    this.issueText = issueText;
  }

  static async findById(id) {
    try {
      const issue = await query("SELECT * FROM issues WHERE id = $1", [id]);
      return issue.rows[0];
    } catch (error) {
      console.error("Error fetching issue by id:", error);
      return null;
    }
  }
}

module.exports = Issue;
