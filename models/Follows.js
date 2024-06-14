const { query } = require("../config/db");

class Follows {
  constructor(followId, followerId, followingId, timestamp) {
    this.followId = followId;
    this.followerId = followerId;
    this.followingId = followingId;
    this.timestamp = timestamp;
  }

  static async findByFollowAndUserId(followingId, followerId) {
    try {
      const follow = await query(
        "SELECT * FROM follows WHERE following_id = $1 AND follower_id = $2",
        [followingId, followerId]
      );
      return follow.rows[0];
    } catch (error) {
      console.error("Error fetching follow by id:", error);
      return null;
    }
  }
}

module.exports = Follows;
