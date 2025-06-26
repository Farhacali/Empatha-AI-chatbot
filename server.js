// Dependencies
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config();

// Express app setup
const app = express();
app.use(cors({ origin: '*' })); // Replace with frontend domain in production
app.use(express.json());

// Optional test route to check if server is alive
app.get('/', (req, res) => {
  res.send('Empatha AI backend is running');
});

// Create HTTP server (required for socket.io)
const server = http.createServer(app);

// Setup Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*', // Replace with frontend Render domain if needed
    methods: ['GET', 'POST'],
  }
});

// Handle socket connections
io.on('connection', (socket) => {
  console.log('✅ New client connected:', socket.id);

  socket.on('chat message', (msg) => {
    io.emit('chat message', msg); // broadcast to all clients
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server + Socket.IO running at http://localhost:${PORT}`);
});
