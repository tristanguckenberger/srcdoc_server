const { query } = require("../config/db");

class Tag {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }

  static async findById(id) {
    try {
      const tag = await query("SELECT * FROM tags WHERE id = $1", [id]);
      return tag.rows[0];
    } catch (error) {
      console.error("Error fetching tag by id:", error);
      return null;
    }
  }

  // get all tags for a game
  static async findByGameId(gameId) {
    try {
      const tags = await query(
        "SELECT * FROM tags JOIN game_tags ON tags.id = game_tags.tag_id WHERE game_tags.game_id = $1",
        [gameId]
      );
      return tags.rows;
    } catch (error) {
      console.error("Error fetching tags by game id:", error);
      return null;
    }
  }

  // find tag by name
  static async findByName(name) {
    try {
      const tag = await query("SELECT * FROM tags WHERE name = $1", [name]);
      return tag.rows[0];
    } catch (error) {
      console.error("Error fetching tag by name:", error);
      return null;
    }
  }
}

module.exports = Tag;
