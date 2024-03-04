const { query } = require("../config/db");

class Leaderboards {
  constructor(
    gameSessionId,
    userId,
    username,
    userAvatar,
    sessionTotalTime,
    sessionTotalScore
  ) {
    this.gameSessionId = gameSessionId;
    this.userId = userId;
    this.username = username;
    this.userAvatar = userAvatar;
    this.sessionTotalTime = sessionTotalTime;
    this.sessionTotalScore = sessionTotalScore;
  }

  /**
   * @name getAllRowsByGameId
   * @param {*} gameId
   *
   * - We need to pull data from the following tables:
   *  - game_session table:
   *   - game_session_id
   *   - user_id
   *   - session_total_time
   *   - session_total_score
   * - and join on users table to get:
   *   - username
   *   - profile_photo
   *
   * - There may be multiple records for a single user per game so we only want to grab the users highest score
   *
   */
  static async getAllRowsByGameId(gameId) {
    try {
      // TODO: Write the SQL query to get the leaderboard data
      const leaderboard = await query(
        `
          SELECT game_session_id, game_session.user_id, username, profile_photo, session_total_time, session_total_score
          FROM game_session
          JOIN users ON game_session.user_id = users.id
          WHERE game_id = $1 AND session_total_score IS NOT NULL
          ORDER BY session_total_score DESC
          `,
        [gameId]
      );
      // TODO: Return the leaderboard.rows
      return leaderboard.rows;
    } catch (error) {
      console.error("Error fetching game sessions by game id:", error);
      return null;
    }
  }
}

module.exports = Leaderboards;
