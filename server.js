const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// ✅ Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // 🔒 You can replace * with your frontend domain
    methods: ['GET', 'POST']
  }
});

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI || process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB error:', err));

// ✅ Import API routes
const userRoutes = require('./routes/user');          // Make sure this file exists
const chatRoutes = require('./routes/chat');          // Must exist
const reminderRoutes = require('./routes/Reminders'); // Capital "R" is fine IF file is named "Reminders.js"
const healthRoutes = require('./routes/health');      // Must exist

// ✅ Route middleware
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/health', healthRoutes);

// ✅ Serve static frontend files (index.html, CSS, JS)
app.use(express.static(path.join(__dirname, 'frontend')));

// ✅ Catch-all route for single-page frontend apps
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ✅ Socket.IO real-time communication
io.on('connection', (socket) => {
  console.log(`📡 New socket connected: ${socket.id}`);

  socket.on('chatMessage', (msg) => {
    console.log(`💬 Message from ${socket.id}: ${msg}`);
    io.emit('chatMessage', msg); // Broadcast to all connected clients
  });

  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

// ✅ Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server + Socket.IO running at http://localhost:${PORT}`);
});