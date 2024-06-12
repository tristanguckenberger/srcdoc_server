const bcrypt = require("bcrypt");
const { query } = require("../config/db");

class User {
  constructor(id, username, email, password, googleId, githubId) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.password = password;
    this.googleId = googleId;
    this.githubId = githubId;
  }

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

  static async findByResetToken(token) {
    if (!token) {
      return null;
    }

    const user = await query(
      "SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()",
      [token]
    );

    if (user.rows.length === 0) {
      return null;
    }

    return user.rows[0];
  }

  async validatePassword(password) {
    if (!password) {
      return false;
    }

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
