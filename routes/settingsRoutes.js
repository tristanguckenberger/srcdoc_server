const express = require("express");
const { query } = require("../config/db");
const { authenticate } = require("../middleware/auth");
const UserSettings = require("../models/UserSettings");

const router = express.Router();

// Get Current User Settings
router.get("/me", authenticate, async (req, res, next) => {
  const userId = req?.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const settings = await UserSettings.findByUserId(userId);

  res.status(200).json(settings);
});

// Update User Settings
router.put("/update", authenticate, async (req, res, next) => {
  const authenticatedUserId = req?.user?.id;

  if (!authenticatedUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const {
    hide_pop_up_info,
    hide_pop_up_info_home,
    hide_pop_up_info_games,
    hide_pop_up_info_editor,
    dark_mode,
    user_accent_color,
  } = req.body;

  const settings = await UserSettings.findByUserId(authenticatedUserId);

  if (!settings && !authenticatedUserId) {
    return res.status(404).json({ message: "User settings not found" });
  }

  if (!settings && authenticatedUserId) {
    try {
      const result = await query(
        "INSERT INTO user_settings (user_id, user_accent_color) VALUES ($1, $2) returning *",
	[authenticatedUserId, user_accent_color]
      );
    } catch (error) {
      next(error);
    }
  }
  try {
    const result = await query(
      "UPDATE user_settings SET hide_pop_up_info = $1, hide_pop_up_info_home = $2, hide_pop_up_info_games = $3, hide_pop_up_info_editor = $4, dark_mode = $5, user_accent_color = $6 WHERE id = $7 RETURNING *",
      [
        hide_pop_up_info,
        hide_pop_up_info_home,
        hide_pop_up_info_games,
        hide_pop_up_info_editor,
        dark_mode,
	user_accent_color,
        settings?.id,
      ]
    );
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
