// server.js
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

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => console.error('❌ MongoDB error:', err));

// ✅ Import API routes
const userRoutes = require('./routes/user');
const chatRoutes = require('./routes/chat');
const reminderRoutes = require('./routes/Reminders');
const healthRoutes = require('./routes/health');

// ✅ Route middleware
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/health', healthRoutes);

// ✅ Serve static frontend files
app.use(express.static(path.join(__dirname, 'frontend')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ✅ GROQ-powered Socket.IO Chat
io.on('connection', (socket) => {
  console.log(`📡 New socket connected: ${socket.id}`);

  socket.on('message', async (data) => {
    const userMessage = data.message;
    const userId = data.userId;
    console.log(`💬 Message from ${userId}: ${userMessage}`);

    try {
      const groqResponse = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama3-70b-8192',
          messages: [
            { role: 'system', content: 'You are Empatha, a friendly, empathetic wellness assistant.' },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
          }
        }
      );

      const reply = groqResponse.data.choices[0].message.content.trim();

      // ✅ Send AI reply to client
      socket.emit('response', {
        response: reply,
        emotion: 'neutral', // You can add emotion detection later
        actions: []
      });

    } catch (err) {
      console.error('❌ GROQ API error:', err.message);
      socket.emit('response', {
        response: '⚠️ Sorry, I couldn’t respond right now. Please try again later.',
        emotion: 'error',
        actions: []
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

// ✅ Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server + AI Chat running at http://localhost:${PORT}`);
});

