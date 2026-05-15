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

// ✅ Environment Variables
const {
  GROQ_API_KEY,
  WEATHER_API_KEY,
  MONGODB_URI,
  JWT_SECRET,
  PORT = 3000
} = process.env;

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ MongoDB connection
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => console.error('❌ MongoDB error:', err));

// ✅ Routes
try {
  app.use('/api/user', require('./routes/user'));
  app.use('/api/chat', require('./routes/chat'));
  app.use('/api/reminders', require('./routes/Reminders'));
  app.use('/api/health', require('./routes/health'));
  app.use('/api/mood', require('./routes/mood'));
} catch (err) {
  console.error('⚠️ Error loading routes:', err.message);
}

// ✅ Serve frontend statically
app.use(express.static(path.join(__dirname, 'frontend')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ✅ Fallback responses (used when GROQ API fails)
const fallbackResponses = [
  "I'm here to listen. How are you feeling today?",
  "That sounds important to you. Tell me more.",
  "Your feelings are valid. I'm here for you.",
  "Thanks for sharing. What would help you feel better?"
];
const getFallbackResponse = () =>
  fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

// ✅ Socket.IO + GROQ integration
io.on('connection', (socket) => {
  console.log(`📡 Connected: ${socket.id}`);

  // ✅ Per-socket conversation history — each user gets their own memory
  const conversationHistory = [];

  socket.emit('response', {
    response: "Hi! I'm Empatha. How are you feeling today?",
    emotion: 'caring'
  });

  socket.on('message', async ({ message, userId }) => {
    console.log(`💬 ${userId}: ${message}`);

    // ✅ Add user message to history before API call
    conversationHistory.push({ role: 'user', content: message });

    // ✅ Trim history to last 20 messages to avoid token overflow
    if (conversationHistory.length > 20) {
      conversationHistory.splice(0, 2);
    }

    try {
      const groqRes = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama3-70b-8192',
          messages: [
            {
              role: 'system',
              content: `You are Empatha, a warm and emotionally intelligent wellness companion.
You remember everything said earlier in this conversation and build on it naturally.
You ask thoughtful follow-up questions, notice patterns in how the user is feeling,
and respond with genuine empathy. Never repeat the same phrase twice.
Keep responses concise (2-4 sentences) and conversational, like a caring friend.`
            },
            ...conversationHistory  // ✅ Full history sent with every request
          ],
          temperature: 0.85,
          max_tokens: 150
        },
        {
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const reply = groqRes.data.choices[0].message.content.trim();

      // ✅ Add assistant reply to history after API call
      conversationHistory.push({ role: 'assistant', content: reply });

      let emotion = 'neutral';
      const lower = reply.toLowerCase();
      if (lower.includes('sorry') || lower.includes('understand')) emotion = 'caring';
      if (lower.includes('great') || lower.includes('happy')) emotion = 'happy';

      socket.emit('response', { response: reply, emotion });

    } catch (err) {
      console.error('❌ GROQ error:', err.message);
      socket.emit('response', {
        response: getFallbackResponse(),
        emotion: 'caring'
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.id}`);
  });
});

// ✅ Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});


