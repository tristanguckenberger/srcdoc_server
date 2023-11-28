const express = require("express");
const { query } = require("../config/db");

const router = express.Router();

// get all tags
router.get("/all", async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM tags");
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});
