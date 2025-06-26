
// server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ✅ Serve static files from frontend folder
app.use(express.static(path.join(__dirname, 'frontend')));

// ✅ Fallback to index.html for single-page routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ✅ Socket.IO logic
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  // ✅ Listen for 'message' event from client
  socket.on('message', (data) => {
    console.log(`📨 Received from ${socket.id}:`, data);

    // ✨ Simulate AI processing and send back a response
    const response = {
      response: `🧠 Empatha says: "${data.message}"`,
      emotion: 'neutral', // Can later replace with real emotion classifier
      actions: [
        { action: 'log', success: true }
      ]
    };

    // ✅ Send response back to the same client
    socket.emit('response', response);
  });

  // (Optional) If you want to support reminders later
  socket.on('setReminder', (data) => {
    setTimeout(() => {
      socket.emit('reminder', { message: data.message });
    }, 5000); // e.g. 5 seconds later
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// ✅ Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
