const express = require("express");
const { query } = require("../config/db");
const Game = require("../models/Game");
const { authenticate } = require("../middleware/auth");
const { placeholder } = require("../middleware/placeholder");
const router = express.Router();

// Create
router.post("/create", authenticate, placeholder, async (req, res, next) => {
  const userId = req?.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const {
    title,
    description = "",
    htmlCode = "",
    cssCode = "",
    jsCode = "",
    published = false,
  } = req.body;

  try {
    const result = await query(
      "INSERT INTO games (title, description, html_code, css_code, js_code, published, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [title, description, htmlCode, cssCode, jsCode, published, userId]
    );
    const createdGame = new Game(
      result.rows[0].id,
      result.rows[0].title,
      result.rows[0].description,
      result.rows[0].html_code,
      result.rows[0].css_code,
      result.rows[0].js_code,
      result.rows[0].user_id
    );
    res.status(201).json(createdGame);
  } catch (error) {
    next(error);
  }
});

// Get All Games
router.get("/all", async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM games");
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get Single Game by Game ID
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query("SELECT * FROM games WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Game not found" });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get Games by User ID
router.get("/user/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await query("SELECT * FROM games WHERE user_id = $1", [
      userId,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No games found for this user" });
    }
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Update
router.put("/update/:id", authenticate, async (req, res, next) => {
  const { id } = req.params;
  const game = await Game.findById(id);

  if (!game) {
    return res.status(404).json({ message: `Game with ID: ${id} not found` });
  }

  const { title, description, htmlCode, cssCode, jsCode, published } = req.body;
  const userId = req?.user?.id;

  if (!userId || userId.toString() !== game.user_id.toString()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await query(
      "UPDATE games SET title = $1, description = $2, html_code = $3, css_code = $4, js_code = $5, published = $6 WHERE id = $7",
      [title, description, htmlCode, cssCode, jsCode, published, id]
    );
    res.status(200).json({ message: "Game updated" });
  } catch (error) {
    next(error);
  }
});

// Delete
router.delete("/delete/:id", authenticate, async (req, res, next) => {
  const { id } = req.params;
  const userId = req?.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await query("DELETE FROM games WHERE id = $1", [id]);
    res.status(200).json({ message: "Game deleted" });
  } catch (error) {
    next(error);
  }
});

// router.post("/saveToGitHub", async (req, res) => {
//   try {
//     const { gameId } = req.body;
//     const game = await getGameById(gameId); // Assuming you have this function
//     if (!game) {
//       return res.status(404).json({ message: "Game not found" });
//     }

//     const github = new Octokit({ auth: req.user.githubToken }); // Assuming GitHub token is stored in req.user
//     const gist = await github.gists.create({
//       files: {
//         "index.html": { content: game.htmlCode },
//         "styles.css": { content: game.cssCode },
//         "script.js": { content: game.jsCode },
//       },
//       description: game.name,
//       public: true,
//     });

//     return res.json({ gistUrl: gist.data.html_url });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "An error occurred" });
//   }
// });

module.exports = router;
