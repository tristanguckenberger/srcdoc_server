const passport = require("passport");
const session = require("express-session");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const { initWebSocket } = require("./ws-server.js");
const http = require("http");
const userRoutes = require("./routes/userRoutes");
const gameRoutes = require("./routes/gameRoutes");
const authRoutes = require("./routes/authRoutes");
const commentsRoutes = require("./routes/commentsRoutes");
const favoritesRoutes = require("./routes/favoritesRoutes");
const reviewsRoutes = require("./routes/reviewsRoutes");
const issuesRoutes = require("./routes/issuesRoutes");
// const tagsRoutes = require("./routes/tagsRoutes");
const gameSessionRoutes = require("./routes/gameSessions");
const activitiesRoutes = require("./routes/activitiesRoutes");
const algoRoutes = require("./routes/algoRoutes");
const playlistRoutes = require("./routes/playlistRoutes");
const gamesPlaylistRoutes = require("./routes/gamesPlaylistRoutes");
const searchRoutes = require("./routes/searchRoute");
const settingsRoutes = require("./routes/settingsRoutes");
const followsRoutes = require("./routes/followsRoutes");
const feedRoutes = require("./routes/feedRoutes");
const usersActivitiesRoutes = require("./routes/usersActivitiesRoutes");
const notificationsRoutes = require("./routes/notificationsRoutes");
const fs = require("fs");
const https = require("https");
const errorHandler = require("./middleware/errorHandler");
const winston = require("winston");
const logger = require("./middleware/logger.js");

const app = express();

//const options = {
//  key: fs.readFileSync(process.env.SSL_KEY),
//  cert: fs.readFileSync(process.env.SSL_CRT)
//};
//const server = https.createServer(options, app);
const server = http.createServer(app);
app.use(express.json());

// Security headers
app.use(helmet());

// Logging middleware
app.use(morgan("tiny"));

// CORS
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute
});
// app.use(limiter);

app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: true, // Save new sessions
    cookie: { secure: false }, // Use secure cookies
  })
);

app.use(passport.initialize());
app.use(passport.session());

require("./passport-setup");

// Routes
app.use("/api/users", userRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/issues", issuesRoutes);
app.use("/api/sessions", gameSessionRoutes);
app.use("/api/activities", activitiesRoutes);
app.use("/api/algo", algoRoutes);
app.use("/api/playlist", playlistRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/follows", followsRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/userActivities", usersActivitiesRoutes);
app.use("/api/notifications", notificationsRoutes);

// app.use("/api/gamesPlaylist", gamesPlaylistRoutes);

// Error Handling Middleware
app.use(errorHandler);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ message: "Not Found" });
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

// Server
const PORT = process.env.PORT || 3001;
const HOST = "0.0.0.0";
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

initWebSocket(server);

server.listen(PORT, HOST, () => {
  console.log(`Server is listening on port ${PORT}`);

  // Get the address and port from the HTTP server
  const address = server.address();
  console.log("address::", address);
  const serverAddress =
    typeof address === "string"
      ? address
      : `${address.address}:${address.port}`;

  console.log(`WebSocket server is running at ws://${serverAddress}`);
});
