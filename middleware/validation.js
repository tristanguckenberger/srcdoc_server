const { body, validationResult } = require("express-validator");

exports.validateGame = [
  body("title").notEmpty().withMessage("Title is required"),
  body("description").notEmpty().withMessage("Description is required"),
  body("htmlCode").notEmpty().withMessage("HTML code is required"),
  body("cssCode").notEmpty().withMessage("CSS code is required"),
  body("jsCode").notEmpty().withMessage("JS code is required"),
  body("authorId").notEmpty().withMessage("Author ID is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    next();
  },
];
