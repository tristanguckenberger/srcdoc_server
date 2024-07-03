const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { query } = require("../config/db");
const User = require("../models/User");
const Game = require("../models/Game");
const GameSession = require("../models/GameSession");
const Comment = require("../models/Comment");
const Favorite = require("../models/Favorite");
const Playlist = require("../models/Playlist");
const Review = require("../models/Review");

dotenv.config();

exports.logActivity = (getActivityData) => async (req, res, next) => {
  let { user_id, target_id, primary_text, activity_type, target_type } =
    await getActivityData(req, res);
  let skip = false;

  // get the username of the user who performed the activity
  const user = await User.findById(user_id);

  if (!user) {
    return res.status(404).json({ message: `User ${user_id} not found` });
  }

  switch (target_type) {
    case "game_session":
      // DONE
      const gameSessionGame = await Game.findById(target_id);
      primary_text = `${user.username} played, "${gameSessionGame?.title}"`;
      break;
    case "game":
      // DONE
      const game = await Game?.findById(target_id);
      primary_text = `${user.username} just published a game, "${game?.title}"`;

      if (!JSON.parse(req?.body?.published)) {
        skip = true;
      }
      break;
    case "comment":
      // DONE
      primary_text = `${user.username} commented`;
      break;
    case "favorite":
      primary_text = "${user.username} liked";
      target_id = req?.params?.id;
      break;
    case "playlist":
      target_id = req?.params?.id;
      break;
    case "review":
      target_id = req?.params?.id;
      break;
    default:
      target_id = req?.params?.id;
      break;
  }

  if (
    (activity_type === "passive" && target_type === "share") ||
    (activity_type === "active" && target_type !== "share")
  ) {
    skip = true;
    throw new Error("Invalid activity and target type pairing");
  }
  try {
    if (!skip) {
      const insertActivityQuery = await query(
        `
        INSERT INTO activity (user_id, target_id, primary_text, activity_type, target_type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
        [user_id, target_id, primary_text || "", activity_type, target_type]
      );

      req.activity = insertActivityQuery.rows[0]; // Store the activity in the request object
    }
    next();
  } catch (error) {
    console.error("Error logging activity:", error);
    next(error);
  }
};
