const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = {}; // roomId -> [ws, ws]

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      console.error("Invalid JSON", e);
      return;
    }

    const { type, room, payload } = data;

    if (type === "join") {
      if (!rooms[room]) rooms[room] = [];
      rooms[room].push(ws);
      ws.room = room;

      // Notify the other peer someone joined
      if (rooms[room].length === 2) {
        rooms[room][0].send(JSON.stringify({ type: "ready" }));
        rooms[room][1].send(JSON.stringify({ type: "ready" }));
      }
    }

    if (type === "signal") {
      const peers = rooms[room];
      if (peers) {
        peers.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "signal", payload }));
          }
        });
      }
    }
  });

  ws.on("close", () => {
    if (ws.room && rooms[ws.room]) {
      rooms[ws.room] = rooms[ws.room].filter((client) => client !== ws);
    }
  });
});

app.use(express.static(path.join(__dirname, "public")));

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});