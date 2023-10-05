const jwt = require("jsonwebtoken");

function generateToken(user) {
  return jwt.sign({ id: user.id }, "your-secret-key", { expiresIn: "1d" });
}
