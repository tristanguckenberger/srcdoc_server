const { query } = require("../config/db");

/**
 * Name: GameSessionActivity
 * Description: This class is used to represent a game session activity. It has the following properties:
 * - gameUserActivityId: the id of the game user activity, primary key
 * - gameSessionId: the id of the game session, foreign key
 * - action: the action that the user performed (e.g. start, pause, resume, stop)
 * - createdAt: the date and time the game session activity was created
 * - updatedAt: the date and time the game session activity was last updated
 */
class GameSessionActivity {
  constructor(gameUserActivityId, gameSessionId, action, createdAt, updatedAt) {
    this.gameUserActivityId = gameUserActivityId;
    this.gameSessionId = gameSessionId;
    this.action = action;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static async findByGameUserActivityId(gameUserActivityId) {
    try {
      const gameSessionActivity = await query(
        "SELECT * FROM game_user_activity WHERE game_user_activity.game_user_activity_id = $1",
        [gameUserActivityId]
      );
      return gameSessionActivity.rows[0];
    } catch (error) {
      console.error(
        "Error fetching game session activity by gameUserActivityId:",
        error
      );
      return null;
    }
  }

  static async findByGameSessionId(gameSessionId) {
    try {
      const gameSessionActivities = await query(
        "SELECT * FROM game_user_activity WHERE game_session_id = $1",
        [gameSessionId]
      );
      return gameSessionActivities.rows;
    } catch (error) {
      console.error(
        "Error fetching game session activities by game session id:",
        error
      );
      return null;
    }
  }
}

module.exports = GameSessionActivity;
