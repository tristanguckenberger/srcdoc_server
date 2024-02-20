const { query } = require("../config/db");

class GameSession {
  constructor(
    gameSessionId,
    gameId,
    userId,
    sessionTotalTime,
    sessionTotalScore,
    createdAt,
    updatedAt
  ) {
    this.gameSessionId = gameSessionId;
    this.gameId = gameId;
    this.userId = userId;
    this.sessionTotalTime = sessionTotalTime;
    this.sessionTotalScore = sessionTotalScore;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static async findByGameSessionId(gameSessionId) {
    try {
      const gameSession = await query(
        "SELECT * FROM game_session WHERE game_session.game_session_id = $1",
        [gameSessionId]
      );
      return gameSession.rows[0];
    } catch (error) {
      console.error("Error fetching game session by game_session_id:", error);
      return null;
    }
  }

  static async findByUserId(userId) {
    try {
      const gameSessions = await query(
        "SELECT * FROM game_session WHERE game_session.user_id = $1",
        [userId]
      );
      return gameSessions.rows;
    } catch (error) {
      console.error("Error fetching game sessions by user id:", error);
      return null;
    }
  }

  static async findByGameId(gameId) {
    try {
      const gameSessions = await query(
        "SELECT * FROM game_session WHERE game_session.game_id = $1",
        [gameId]
      );
      return gameSessions.rows;
    } catch (error) {
      console.error("Error fetching game sessions by game id:", error);
      return null;
    }
  }
}

module.exports = GameSession;
