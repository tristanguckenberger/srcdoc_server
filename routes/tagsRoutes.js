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

// add a new tag
router.post("/add", async (req, res, next) => {
  const { name } = req.body;

  // make sure the name is not empty and that it doesn't already exist
  if (!name) {
    return res.status(400).json({ message: "Name is required" });
  }

  const tag = await query("SELECT * FROM tags WHERE name = $1", [name]);

  if (tag.rows.length > 0) {
    return res
      .status(400)
      .json({ message: "Tag already exists", tag: tag.rows[0] });
  }

  try {
    const result = await query(
      "INSERT INTO tags (name) VALUES ($1) RETURNING *",
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});
