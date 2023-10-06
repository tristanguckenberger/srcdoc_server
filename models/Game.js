const { query } = require("../config/db");

class Game {
  constructor(
    id,
    title,
    description,
    htmlCode,
    cssCode,
    jsCode,
    userId,
    published
  ) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.htmlCode = htmlCode;
    this.cssCode = cssCode;
    this.jsCode = jsCode;
    this.userId = userId;
    this.published = published;
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
}

module.exports = Game;
