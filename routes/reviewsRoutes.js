const express = require("express");
const { query } = require("../config/db");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const Review = require("../models/Review");
const Tag = require("../models/Tag");

// Add review to Reviews table
router.post("/create/:id", authenticate, async (req, res, next) => {
  const userId = req?.user?.id;
  const gameId = req?.params?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!gameId) {
    return res.status(401).json({ message: "Please provide a game id" });
  }

  /**
   * title can be null or a string
   * body can be null or a string
   * rating must be one of 0, 1, 2, 3, 4, or 5
   * difficulty must be one of 0, 1, 2, 3, 4, or 5
   * recommended must be true or false
   * tags can be null or an array of strings
   */
  const { title, body, rating, difficulty, recommended, tags } = req.body;

  if (title && typeof title !== "string") {
    return res.status(400).json({ message: "Title must be a string" });
  }

  if (body && typeof body !== "string") {
    return res.status(400).json({ message: "Body must be a string" });
  }

  if ((rating && ![0, 1, 2, 3, 4, 5].includes(rating)) || !rating) {
    return res
      .status(400)
      .json({ message: "Must include rating between 0 and 5" });
  }

  if ((difficulty && ![0, 1, 2, 3, 4, 5].includes(difficulty)) || !difficulty) {
    return res
      .status(400)
      .json({ message: "Must include difficulty between 0 and 5" });
  }

  if ((recommended && typeof recommended !== "boolean") || !recommended) {
    return res
      .status(400)
      .json({ message: "Recommended must be true or false" });
  }

  try {
    // check if user has already reviewed the game
    const existingReview = await Review.findByUserAndGame(userId, gameId);

    if (existingReview) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this game" });
    }

    const result = await query(
      "INSERT INTO reviews (user_id, game_id, rating, title, body, difficulty, recommended) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [userId, gameId, rating, title, body, difficulty, recommended]
    );

    if (tags) {
      try {
        if (!Array.isArray(tags)) {
          return res.status(400).json({ message: "Tags must be an array" });
        }

        for (const tag of tags) {
          if (typeof tag !== "string") {
            return res
              .status(400)
              .json({ message: "Tags must be an array of strings" });
          }

          // Check if tag already exists
          // if not, create it
          // then get the tag id
          let findTag = await Tag.findByName(tag);
          if (!findTag) {
            const insertTagResult = await query(
              "INSERT INTO tags (review_id, tag) VALUES ($1, $2) RETURNING *",
              [result.rows[0].id, tag]
            );

            findTag = insertTagResult?.rows[0];
          }

          const tagId = findTag.id;
          const reviewId = result.rows[0].id;

          // Insert the tag into the review_tags table
          const insertReviewTagResult = await query(
            "INSERT INTO review_tags (review_id, tag_id) VALUES ($1, $2) RETURNING *",
            [reviewId, tagId]
          );

          // If the tag was inserted into review_tags, check if a record for the tag exists in the game_tags table, and add it if it doesn't
          if (insertReviewTagResult.rows.length > 0) {
            // Check if a record for the tag exists in the game_tags table
            // if not, create it
            const findGameTag = await query(
              "SELECT * FROM game_tags WHERE game_id = $1 AND tag_id = $2",
              [gameId, tagId]
            );
            if (findGameTag.rows.length === 0) {
              await query(
                "INSERT INTO game_tags (game_id, tag_id) VALUES ($1, $2)",
                [gameId, tagId]
              );
            }
          }
        }
      } catch (error) {
        console.log(error);
        res.status(201).json(result.rows[0]);
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get all reviews
router.get("/all", async (req, res) => {
  try {
    const result = await query("SELECT * FROM reviews");
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get single review by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Get review by ID
    const result = await query("SELECT * FROM reviews WHERE id = $1", [id]);

    // Get all tags for the review by ID
    const tags = await query(
      "SELECT tags.name FROM tags JOIN review_tags ON tags.id = review_tags.tag_id WHERE review_tags.review_id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const review = result.rows[0];
    review.tags = [...tags.rows];
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get all reviews for a game
router.get("/games/:gameId", async (req, res) => {
  try {
    const { gameId } = req.params;
    const result = await query("SELECT * FROM reviews WHERE game_id = $1", [
      gameId,
    ]);

    const taggedReviews = await Promise.all(
      result.rows.map(async (review) => {
        const tags = await query(
          "SELECT tags.name FROM tags JOIN review_tags ON tags.id = review_tags.tag_id WHERE review_tags.review_id = $1",
          [review.id]
        );

        return { ...review, tags: [...tags.rows] };
      })
    );

    res.status(200).json(taggedReviews);
  } catch (error) {
    next(error);
  }
});

// Get all reviews from a user
router.get("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await query("SELECT * FROM reviews WHERE user_id = $1", [
      userId,
    ]);
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Update single review
router.put("/update/:id", authenticate, async (req, res, next) => {
  const { id } = req.params;

  const userId = req?.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const review = await Review.findById(id);
  if (!review) {
    return res.status(404).json({ message: "Review not found" });
  }

  const gameId = review.game_id;

  if (userId.toString() !== review.user_id.toString()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // get existing review tags
  const existingTags = await query(
    "SELECT * FROM review_tags WHERE review_id = $1",
    [id]
  );

  console.log(`/api/reviews/update/${id}::existingTags`, existingTags.rows);

  const {
    title = review?.title,
    body = review?.body,
    rating = review.rating,
    difficulty = review.difficulty,
    recommended,
    tags = [],
  } = req.body;
  let tagsToDelete = [];

  // build a new array of tags to delete based on the incoming request and the existing tags
  /**
   * If a tag is in the existing tags but not in the incoming request, add it to the tagsToDelete array
   *
   * - when a tag is deleted from a review,
   * it should only be deleted from the review_tags table
   * unless the tag is not used by any other reviews for
   * the same game, then it should be deleted from the
   * game_tags table as well
   *
   */
  for (const existingTag of existingTags.rows) {
    // get the tag name for each existing tag
    const tag = await query("SELECT * FROM tags WHERE id = $1", [
      existingTag?.tag_id,
    ]);
    if (!tags.includes(tag.rows[0].name)) {
      tagsToDelete.push(tag.rows[0].id);
    }
  }

  if (title && typeof title !== "string") {
    return res.status(400).json({ message: "Title must be a string" });
  }
  if (body && typeof body !== "string") {
    return res.status(400).json({ message: "Body must be a string" });
  }
  if ((rating && ![0, 1, 2, 3, 4, 5].includes(rating)) || !rating) {
    return res
      .status(400)
      .json({ message: "Must include rating between 0 and 5" });
  }
  if ((difficulty && ![0, 1, 2, 3, 4, 5].includes(difficulty)) || !difficulty) {
    return res
      .status(400)
      .json({ message: "Must include difficulty between 0 and 5" });
  }
  if ((recommended && typeof recommended !== "boolean") || !recommended) {
    return res
      .status(400)
      .json({ message: "Recommended must be true or false" });
  }

  try {
    const result = await query(
      "UPDATE reviews SET rating = $1, title = $2, body = $3, difficulty = $4, recommended = $5 WHERE id = $6 RETURNING *",
      [rating, title, body, difficulty, recommended, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "review not found" });
    }

    if (tags) {
      try {
        if (!Array.isArray(tags)) {
          return res.status(400).json({ message: "Tags must be an array" });
        }

        console.log(`/api/reviews/update/${id}::tags`, tags);
        console.log(`/api/reviews/update/${id}::tagsToDelete`, tagsToDelete);

        // delete any tags in tagsToDelete
        for (const tagId of tagsToDelete) {
          // delete the tag from the review_tags table
          await query(
            "DELETE FROM review_tags WHERE review_id = $1 AND tag_id = $2",
            [id, tagId]
          );

          // check if the tag is used by any other reviews for the same game
          const tagInGame = await query(
            "SELECT * FROM review_tags WHERE tag_id = $1",
            [tagId]
          );

          if (tagInGame.rows.length === 0) {
            // if not, delete the tag from the game_tags table
            await query("DELETE FROM game_tags WHERE tag_id = $1", [tagId]);
          }
        }

        // add the new tags
        for (const tag of tags) {
          if (typeof tag !== "string") {
            return res
              .status(400)
              .json({ message: "Tags must be an array of strings" });
          }

          // Check if tag already exists
          // if not, create it
          // then get the tag id
          let findTag = await Tag.findByName(tag);
          if (!findTag) {
            const insertTagResult = await query(
              "INSERT INTO tags (name) VALUES ($1) RETURNING *",
              [tag]
            );

            findTag = insertTagResult?.rows[0];
          }

          const tagId = findTag.id;
          const reviewId = result.rows[0].id;

          const findReviewTag = await query(
            "Select * FROM review_tags WHERE review_id = $1 AND tag_id = $2",
            [reviewId, tagId]
          );

          if (findReviewTag.rows.length === 0) {
            // Insert the tag into the review_tags table
            const insertReviewTagResult = await query(
              "INSERT INTO review_tags (review_id, tag_id) VALUES ($1, $2) RETURNING *",
              [reviewId, tagId]
            );

            // If the tag was inserted into review_tags, check if a record for the tag exists in the game_tags table, and add it if it doesn't
            if (insertReviewTagResult.rows.length > 0) {
              // Check if a record for the tag exists in the game_tags table
              // if not, create it
              const findGameTag = await query(
                "SELECT * FROM game_tags WHERE game_id = $1 AND tag_id = $2",
                [gameId, tagId]
              );
              if (findGameTag.rows.length === 0) {
                await query(
                  "INSERT INTO game_tags (game_id, tag_id) VALUES ($1, $2)",
                  [gameId, tagId]
                );
              }
            }
          }
        }
      } catch (error) {
        console.log(error);
        res.status(201).json(result.rows[0]);
      }
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete single review
router.delete("/delete/:id", authenticate, async (req, res, next) => {
  const { id } = req.params;
  const userId = req?.user?.id;

  const review = await Review.findById(id);

  if (!review) {
    return res.status(404).json({ message: "Review not found" });
  }

  if (!userId || userId.toString() !== review.user_id.toString()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await query("DELETE FROM reviews WHERE id = $1", [id]);
    res.status(200).json({ message: "Review deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
