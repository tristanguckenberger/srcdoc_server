const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const User = require("../models/User");

dotenv.config();

exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({ message: "Invalid token format." });
    }

    const token = parts[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded?.id);
      const path = req?.originalUrl;

      if (
        (!user?.is_active &&
          !path.includes("/api/auth/logout") &&
          !path.includes("/api/users/update/") &&
          !path.includes("/api/users/me")) ||
        (!user?.is_active &&
          !path.includes("/api/auth/logout") &&
          !req?.body?.isActive &&
          path.includes("/api/users/update/") &&
          !path.includes("/api/users/me"))
      ) {
        return res.status(401).json({
          message: `User account, "${
            user?.username ?? "username"
          }", is not active!`,
        });
      }

      req.user = user;
      next();
    } catch (err) {
      res.status(400).json({ message: "Invalid token." });
    }
  } catch (error) {
    console.log("ERROR::", error);
    return res
      .status(400)
      .json({ message: "Bad token" })
      .cookies("token", "", { expires: new Date(0) });
  }
};

// module.exports = authenticate;
