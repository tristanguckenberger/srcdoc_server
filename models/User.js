const bcrypt = require("bcrypt");
const { query } = require("../config/db");
const winston = require("winston");
const logger = require("../middleware/logger");

class User {
  constructor(id, username, email, password, googleId, githubId) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.password = password;
    this.googleId = googleId;
    this.githubId = githubId;
  }
  /** 
 *       await query("UPDATE users SET github_token = $1 WHERE id = $2", [
        githubToken,
        userId,
      ]);
 * 
 * 
 * 
*/

  static async findByEmail(email) {
    try {
      const user = await query("SELECT * FROM users WHERE email = $1", [email]);
      return user.rows[0];
    } catch (error) {
      console.error("Error fetching user by email:", error);
      return null;
    }
  }

  static async findById(id) {
    try {
      const user = await query("SELECT * FROM users WHERE id = $1", [id]);
      return user.rows[0];
    } catch (error) {
      console.error("Error fetching user by id:", error);
      return null;
    }
  }

  async validatePassword(password) {
    if (!password) {
      return false;
    }
    console.log("this.password::validatePassword", this.password);
    try {
      const match = await bcrypt.compare(password, this.password);
      return match;
    } catch (error) {
      console.error("Error validating password:", error);
      return false;
    }
  }
}

module.exports = User;
