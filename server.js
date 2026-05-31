const express = require('express');
const http = require('http');
const fs = require('fs');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const WIDTH = 1500;
const HEIGHT = 1500;
const SAVE_FILE = './canvas.json';

let canvas = new Map();

if (fs.existsSync(SAVE_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
    canvas = new Map(data);
    console.log("Canvas chargé");
  } catch (e) {
    console.error(e);
  }
}

let saveTimeout = null;

function scheduleSave() {
  if (saveTimeout) return;

  saveTimeout = setTimeout(() => {
    fs.writeFile(
      SAVE_FILE,
      JSON.stringify([...canvas]),
      err => err && console.error(err)
    );
    saveTimeout = null;
  }, 5000);
}

app.use(express.static('public'));

io.on('connection', socket => {
  console.log("Client connecté");

  // envoi canvas complet (une fois)
  socket.emit('canvas-data', [...canvas]);

  socket.on('draw-pixel', ({ x, y, color }) => {
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;

    const key = `${x},${y}`;
    canvas.set(key, color);

    scheduleSave();

    socket.broadcast.emit('pixel-updated', { x, y, color });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log("Serveur sur http://localhost:" + PORT);
});
