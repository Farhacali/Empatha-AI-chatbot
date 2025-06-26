// Dependencies
// server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Initialize Express app
const app = express();

// Create HTTP server for socket.io
const server = http.createServer(app);

// Setup Socket.IO without CORS (same origin)
const io = new Server(server);

// Serve the frontend build (from frontend/build folder)
app.use(express.static(path.join(__dirname, 'frontend', 'build')));

// Fallback route for React SPA (Single Page Application)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'build', 'index.html'));
});

// Handle socket.io connections
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  socket.on('chat message', (msg) => {
    console.log('📨 Message received:', msg);
    io.emit('chat message', msg);
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server + Socket.IO running on http://localhost:${PORT}`);
});

