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

// ✅ Socket.IO + GROQ integration
const fallbackResponses = [
  "I'm here to listen. How are you feeling today?",
  "That sounds important to you. Tell me more.",
  "Your feelings are valid. I'm here for you.",
  "Thanks for sharing. What would help you feel better?"
];
const getFallbackResponse = () => fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

io.on('connection', (socket) => {
  console.log(`📡 Connected: ${socket.id}`);

  socket.emit('response', {
    response: "Hi! I'm Empatha. How are you feeling today?",
    emotion: 'caring'
  });

  socket.on('message', async ({ message, userId }) => {
    console.log(`💬 ${userId}: ${message}`);

    try {
      const groqRes = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama3-70b-8192',
          messages: [
            {
              role: 'system',
              content: 'You are Empatha, a kind and helpful wellness companion. Reply warmly and help users feel heard.'
            },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
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


