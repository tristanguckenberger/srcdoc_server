const express = require("express");
const { query } = require("../config/db");
const { authenticate } = require("../middleware/auth");
const bcrypt = require("bcrypt");

const router = express.Router();
const multer = require("multer");

// Set up multer with memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Get Current User
router.get("/me", authenticate, async (req, res, next) => {
  const id = req?.user?.id;
  console.log("id", id);
  // try {
  const result = await query("SELECT * FROM users WHERE id = $1", [id]);
  res.status(200).json(result.rows[0]);
  // } catch (error) {
  //   next(error);
  // }
});

// Get All Users
router.get("/all", async (req, res, next) => {
  try {
    const result = await query(
      "SELECT id, username, email, profile_photo, bio, is_active FROM users"
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get Single User by User ID
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query("SELECT * FROM users WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update User
router.put(
  "/update/:id",
  authenticate,
  upload.single("profilePhoto"),
  async (req, res, next) => {
    console.log("req.body", req.body);
    console.log("req.file", req.file);
    console.log("req.params", req.params);
    console.log("req.user", req.user);
    const { id } = req.params;
    const userId = req?.user?.id;

    if (!userId || userId.toString() !== id.toString()) {
      console.log("!userId || userId.toString() !== id.toString()");
      console.log("userId", userId.toString());
      console.log("id", id.toString());
      return res.status(401).json({ message: "Unauthorized" });
    }

    const allowedFields = [
      "username",
      "password",
      "email",
      "profilePhoto",
      "bio",
      "isActive",
    ];

    let base64;
    if (req.file) {
      const fileBuffer = req.file.buffer;
      base64 = fileBuffer.toString("base64");
    }

    const updates = Object.keys({ ...req.body, profilePhoto: base64 });

    // Filtering out invalid field names
    const validUpdates = updates.filter((update) =>
      allowedFields.includes(update)
    );

    if (validUpdates?.length === 0) {
      return res.status(400).json({ message: "No valid fields for update" });
    } else if (validUpdates?.includes("isActive") && validUpdates?.length > 1) {
      return res.status(401).json({
        message:
          "You may not access other fields while activating or deactivating.",
      });
      // }
      //  else if (validUpdates?.includes("username") && validUpdates?.length > 1) {
      //   return res.status(401).json({
      //     message:
      //       "You may not access other fields while updating your username.",
      //   });
    } else if (validUpdates?.includes("email") && validUpdates?.length > 1) {
      return res.status(401).json({
        message: "You may not access other fields while updating your email.",
      });
    } else if (validUpdates?.includes("password") && validUpdates?.length > 1) {
      return res.status(401).json({
        message:
          "You may not access other fields while updating your password.",
      });
    } else if (validUpdates?.includes("password")) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.password, salt);
      req.body.password = hashedPassword;
    }

    let queryStr = "UPDATE users SET ";
    let queryValues = [];
    let counter = 1;

    validUpdates.forEach((field, index) => {
      console.log("=======================");
      console.log("validUpdates::field::", field);
      let dbField =
        field === "profilePhoto"
          ? "profile_photo"
          : field === "isActive"
          ? "is_active"
          : field;

      if (field === "profilePhoto" || field === "profile_photo") {
        console.log('field === "profilePhoto" || field === "profile_photo"');
        console.log("field::", field);
        console.log("validUpdates::base64::", base64);
      }

      if (field === "profile_photo" && base64) {
        queryStr += `${dbField} = $${counter}`;
        queryValues.push(base64);
      } else {
        queryStr += `${dbField} = $${counter}`;
        queryValues.push(req.body[field]);
      }

      if (index < validUpdates.length - 1) {
        queryStr += ", ";
      }
      counter++;
    });

    queryStr += ` WHERE id = $${counter}`;
    queryValues.push(id);

    console.log("queryStr:::::::::::::::::", queryStr);
    console.log("queryValues:::::::::::::::::", queryValues);

    try {
      await query(queryStr, queryValues);
      res.status(200).json({ message: "User updated" });
    } catch (error) {
      next(error);
    }
  }
);

// Delete User
router.delete("/delete/:id", authenticate, async (req, res, next) => {
  const { id } = req.params;
  const userId = req?.user?.id;

  if (!userId || userId !== id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await query("DELETE FROM users WHERE id = $1", [id]);
    res.status(200).json({ message: "Account deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
