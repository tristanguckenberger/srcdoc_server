const { query } = require("../config/db");

class Follows {
  constructor(followId, followerId, followingId, timestamp) {
    this.followId = followId;
    this.followerId = followerId;
    this.followingId = followingId;
    this.timestamp = timestamp;
  }

  //   static async findFollowsByFollowerId(id) {
  //     try {
  //       const follow = await query("SELECT * FROM follows WHERE id = $1", [id]);
  //       return issue.rows[0];
  //     } catch (error) {
  //       console.error("Error fetching issue by id:", error);
  //       return null;
  //     }
  //   }
}

module.exports = Issue;
