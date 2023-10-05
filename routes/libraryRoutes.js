const express = require("express");
const { query } = require("../config/db");
const authenticate = require("../middleware/auth");

const router = express.Router();

// Get available libraries
router.get("/", async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM libraries");
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Add a new library (Admin only)
router.post("/", authenticate, async (req, res, next) => {
  const { name, url } = req.body;
  try {
    await query("INSERT INTO libraries (name, url) VALUES ($1, $2)", [
      name,
      url,
    ]);
    res.status(201).json({ message: "Library added" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
