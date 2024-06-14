const { query } = require("../config/db");

class UserSettings {
  constructor(
    id,
    userId,
    createdDate,
    updatedDate,
    hidePopUpInfo,
    hidePopUpInfoHome,
    hidePopUpInfoGames,
    hidePopUpInfoEditor,
    darkMode
  ) {
    this.id = id;
    this.userId = userId;
    this.createdDate = createdDate;
    this.updatedDate = updatedDate;
    this.hidePopUpInfo = hidePopUpInfo;
    this.hidePopUpInfoHome = hidePopUpInfoHome;
    this.hidePopUpInfoGames = hidePopUpInfoGames;
    this.hidePopUpInfoEditor = hidePopUpInfoEditor;
    this.darkMode = darkMode;
  }

  static async findById(id) {
    try {
      const settings = await query(
        "SELECT * FROM user_settings WHERE id = $1",
        [id]
      );
      return settings.rows[0];
    } catch (error) {
      console.error("Error fetching user settings by id:", error);
      return null;
    }
  }

  static async findByUserId(userId) {
    try {
      const settings = await query(
        "SELECT * FROM user_settings WHERE user_id = $1",
        [userId]
      );
      return settings.rows[0];
    } catch (error) {
      console.error("Error fetching user settings by user id:", error);
      return null;
    }
  }
}

module.exports = UserSettings;
