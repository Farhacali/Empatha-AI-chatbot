const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Check for required environment variables
console.log('🔍 Checking environment variables...');
console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY ? '✅ Set' : '❌ Missing');
console.log('MONGO_URI:', process.env.MONGO_URI ? '✅ Set' : '❌ Missing');

// ✅ Connect to MongoDB
if (process.env.MONGO_URI || process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB error:', err));
} else {
  console.log('⚠️ MongoDB URI not found, running without database');
}

// ✅ Import API routes (with error handling)
try {
  const userRoutes = require('./routes/user');
  const chatRoutes = require('./routes/chat');
  const reminderRoutes = require('./routes/Reminders');
  const healthRoutes = require('./routes/health');
  const moodRoutes = require('./routes/mood'); // ✅ Added mood routes

  // ✅ Route middleware
  app.use('/api/user', userRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/reminders', reminderRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/mood', moodRoutes); // ✅ Mounted mood routes

  console.log('✅ API routes loaded');
} catch (error) {
  console.log('⚠️ Some API routes not found, continuing without them:', error.message);
}

// ✅ Serve static frontend files
app.use(express.static(path.join(__dirname, 'frontend')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ✅ Fallback AI responses
const fallbackResponses = [
  "I'm here to listen. How are you feeling today?",
  "That sounds important to you. Tell me more about what's on your mind.",
  "I understand you're going through something. Would you like to talk about it?",
  "Your feelings are valid. How can I support you right now?",
  "Thank you for sharing with me. What would help you feel better?"
];

function getFallbackResponse() {
  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
}

// ✅ GROQ-powered Socket.IO Chat
io.on('connection', (socket) => {
  console.log(`📡 New socket connected: ${socket.id}`);

  socket.emit('response', {
    response: 'Hello! I\'m Empatha, your wellness companion. How are you feeling today? 💙',
    emotion: 'caring',
    actions: [{ action: 'Connected to server', success: true }]
  });

  socket.on('message', async (data) => {
    const userMessage = data.message;
    const userId = data.userId;

    console.log(`💬 Message from ${userId}: ${userMessage}`);

    if (!process.env.GROQ_API_KEY) {
      console.log('⚠️ GROQ API key missing, using fallback response');
      socket.emit('response', {
        response: getFallbackResponse(),
        emotion: 'caring',
        actions: [{ action: 'Used fallback response', success: true }]
      });
      return;
    }

    try {
      console.log('🤖 Calling GROQ API...');
      const groqResponse = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama3-70b-8192',
          messages: [
            { 
              role: 'system', 
              content: 'You are Empatha, a compassionate AI wellness companion. Respond with empathy, care, and helpful guidance. Keep responses concise but meaningful. Focus on emotional support and mental wellness.'
            },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7,
          max_tokens: 150
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
          },
          timeout: 10000
        }
      );

      const reply = groqResponse.data.choices[0].message.content.trim();
      console.log('✅ GROQ response received:', reply.substring(0, 50) + '...');

      let emotion = 'neutral';
      const lowerReply = reply.toLowerCase();
      if (lowerReply.includes('sorry') || lowerReply.includes('understand')) emotion = 'caring';
      if (lowerReply.includes('great') || lowerReply.includes('wonderful')) emotion = 'happy';
      if (lowerReply.includes('concern') || lowerReply.includes('worry')) emotion = 'concerned';

      socket.emit('response', {
        response: reply,
        emotion: emotion,
        actions: [
          { action: 'GROQ API call', success: true },
          { action: 'Emotion analysis', success: true }
        ]
      });

    } catch (err) {
      console.error('❌ GROQ API error:', err.message);
      socket.emit('response', {
        response: getFallbackResponse(),
        emotion: 'caring',
        actions: [
          { action: 'GROQ API call', success: false, error: err.message },
          { action: 'Fallback response', success: true }
        ]
      });
    }
  });

  socket.on('test', (data) => {
    console.log('🧪 Test message received:', data);
    socket.emit('response', {
      response: 'Test successful! 🎉 Server is working correctly.',
      emotion: 'happy',
      actions: [
        { action: 'Test message processed', success: true },
        { action: 'Socket communication', success: true }
      ]
    });
  });

  socket.on('mood_update', (data) => {
    console.log('😊 Mood update received:', data);
    socket.emit('response', {
      response: `Thank you for sharing your mood with me. I've noted that you're feeling ${data.mood}. 💙`,
      emotion: 'caring',
      actions: [
        { action: 'Mood recorded', success: true }
      ]
    });
  });

  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });

  socket.onAny((eventName, ...args) => {
    console.log(`📡 Socket event: ${eventName}`, args);
  });
});

// ✅ Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server + AI Chat running at http://localhost:${PORT}`);
  console.log(`📱 Frontend available at http://localhost:${PORT}`);
  console.log('📋 Debug info:');
  console.log(`   - GROQ API: ${process.env.GROQ_API_KEY ? 'Configured' : 'Not configured (will use fallbacks)'}`);
  console.log(`   - MongoDB: ${process.env.MONGO_URI ? 'Configured' : 'Not configured'}`);
});

