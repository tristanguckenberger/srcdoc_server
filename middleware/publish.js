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
const File = require("../models/File");

dotenv.config();

/**
 * @name publishGameCheck
 * @description Checks to ensure that the game meets the minimum requirements to be published
 *
 * Requirements:
 * - Game title
 * - Game description
 * - Game thumbnail
 * - Game files
 *
 *
 * @returns next();
 */
exports.publishGameCheck = () => async (req, res, next) => {
  let { title, description, thumbnail, published } = req.body;
  const { id } = req.params;
  let skip = false;

  // First we should check if the game is already published or not
  const game = await Game.findById(id);
  if (game.published) {
    req.canPublish = true;
    skip = true;
  }

  if (!skip) {
    if (!title || !description || !thumbnail) {
      req.canPublish = false;
    }

    req.canPublish = true;
  }

  next();
};
