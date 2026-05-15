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

const fallbackResponses = [
  "I'm here to listen. How are you feeling today?",
  "That sounds important to you. Tell me more.",
  "Your feelings are valid. I'm here for you.",
  "Thanks for sharing. What would help you feel better?"
];
const getFallbackResponse = () =>
  fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

io.on('connection', (socket) => {
  console.log(`📡 Connected: ${socket.id}`);
  console.log('🔑 GROQ Key loaded:', !!process.env.GROQ_API_KEY);

  const conversationHistory = [];

  socket.emit('response', {
    response: "Hi! I'm Empatha. How are you feeling today?",
    emotion: 'caring'
  });

  socket.on('message', async ({ message, userId }) => {
    console.log(`💬 Message from ${userId}: ${message}`);

    conversationHistory.push({ role: 'user', content: message });
    if (conversationHistory.length > 20) conversationHistory.splice(0, 2);

    try {
      const groqRes = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: `You are Empatha, a warm and emotionally intelligent wellness companion for elderly people.
You remember everything said earlier in this conversation and build on it naturally.
You ask thoughtful follow-up questions, notice patterns in how the user is feeling,
and respond with genuine empathy. Never repeat the same phrase twice.
Keep responses concise (2-4 sentences) and conversational, like a caring friend.`
            },
            ...conversationHistory
          ],
          temperature: 0.85,
          max_tokens: 150
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const reply = groqRes.data.choices[0].message.content.trim();
      conversationHistory.push({ role: 'assistant', content: reply });

      let emotion = 'neutral';
      const lower = reply.toLowerCase();
      if (lower.includes('sorry') || lower.includes('understand')) emotion = 'caring';
      if (lower.includes('great') || lower.includes('happy')) emotion = 'happy';

      console.log('✅ Groq replied:', reply.slice(0, 60));
      socket.emit('response', { response: reply, emotion });

    } catch (err) {
      console.error('❌ Groq API error:', JSON.stringify(err.response?.data) || err.message);
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
