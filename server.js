const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = {};

wss.on('connection', socket => {
  socket.on('message', message => {
    const data = JSON.parse(message);
    const { roomId } = data;

    if (data.type === 'join') {
      if (!rooms[roomId]) rooms[roomId] = [];
      rooms[roomId].push(socket);
      socket.roomId = roomId;

      if (rooms[roomId].length === 2) {
        rooms[roomId].forEach(s => s.send(JSON.stringify({ type: 'ready' })));
      }
    }

    if (data.type === 'signal') {
      rooms[roomId]
        .filter(s => s !== socket)
        .forEach(s => s.send(JSON.stringify({ type: 'signal', signal: data.signal })));
    }
  });

  socket.on('close', () => {
    const room = rooms[socket.roomId];
    if (room) {
      rooms[socket.roomId] = room.filter(s => s !== socket);
      room.forEach(s => s.send(JSON.stringify({ type: 'leave' })));
    }
  });
});

app.use(express.static('public'));


app.listen(3001, '0.0.0.0', () => {
  console.log("Server running on port 3001");
});
