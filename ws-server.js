const WebSocket = require("ws");

let wss;
const userSockets = new Map(); // Map to store user ID and WebSocket connection

const initWebSocket = (server) => {
  wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("New client connected");

    ws.on("message", (message) => {
      const parsedMessage = JSON.parse(message);

      if (parsedMessage.type === "register") {
        const userId = parsedMessage.userId;
        userSockets.set(userId, ws);
        ws.userId = userId; // Attach userId to WebSocket for easy reference
        console.log(`User ${userId} registered`);
      }
    });

    ws.on("close", () => {
      if (ws.userId) {
        userSockets.delete(ws.userId);
        console.log(`User ${ws.userId} disconnected`);
      }
    });
  });
};

const getWss = () => wss;
const getUserSockets = () => userSockets;

module.exports = {
  initWebSocket,
  getWss,
  getUserSockets,
};
