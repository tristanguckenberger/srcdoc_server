const { query } = require("../config/db");

class File {
  constructor(
    id,
    name,
    type,
    content,
    gameId,
    parentFileId,
    createdAt,
    updatedAt
  ) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.content = content;
    this.gameId = gameId;
    this.parentFileId = parentFileId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  // static find single file by file id
  static async findById(id) {
    try {
      const file = await query("SELECT * FROM files WHERE id = $1", [id]);
      return file.rows[0];
    } catch (error) {
      console.error("Error fetching file by id:", error);
      return null;
    }
  }

  // static find all files by game id
  static async findByGameId(gameId) {
    try {
      const files = await query("SELECT * FROM files WHERE game_id = $1", [
        gameId,
      ]);
      return files.rows;
    } catch (error) {
      console.error("Error fetching files by game id:", error);
      return null;
    }
  }

  // static find all files by parent file id
  static async findByParentFileId(parentFileId) {
    try {
      const files = await query(
        "SELECT * FROM files WHERE parent_file_id = $1",
        [parentFileId]
      );
      return files.rows;
    } catch (error) {
      console.error("Error fetching files by parent file id:", error);
      return null;
    }
  }

  // static find all files by type
  static async findByType(type) {
    try {
      const files = await query("SELECT * FROM files WHERE type = $1", [type]);
      return files.rows;
    } catch (error) {
      console.error("Error fetching files by type:", error);
      return null;
    }
  }
}

module.exports = File;
