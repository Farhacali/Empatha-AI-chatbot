const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB error:', err));

try {
  app.use('/api/user', require('./routes/user'));
  app.use('/api/chat', require('./routes/chat'));
  app.use('/api/reminders', require('./routes/Reminders'));
  app.use('/api/health', require('./routes/health'));
  app.use('/api/mood', require('./routes/mood'));
} catch (err) {
  console.error('⚠️ Error loading routes:', err.message);
}

app.use(express.static(path.join(__dirname, 'frontend')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const AIAgent = require('./services/AIAgent');
const aiAgent = new AIAgent();

io.on('connection', (socket) => {
  console.log(`📡 Connected: ${socket.id}`);
  console.log('🔑 GROQ Key loaded:', !!process.env.GROQ_API_KEY);

  // Assign socket to aiAgent dynamically
  aiAgent.io = io;

  socket.emit('response', {
    response: "Hi! I'm Empatha. How are you feeling today?",
    emotion: 'caring'
  });

  socket.on('message', async ({ message, userId }) => {
    console.log(`💬 Message from ${userId}: ${message}`);

    try {
      // Route the message through the sophisticated AIAgent
      const result = await aiAgent.processMessage(message, userId, socket);
      socket.emit('response', result);
    } catch (err) {
      console.error('❌ Error processing message in socket:', err);
      socket.emit('response', {
        response: "I'm having a little trouble connecting right now, but I'm still here for you.",
        emotion: 'caring',
        actions: []
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

