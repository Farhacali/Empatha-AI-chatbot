const axios = require('axios');
const UserModel = require('../models/User');
const ConversationModel = require('../models/Conversation');
const ReminderService = require('./ReminderService');
const HealthService = require('./HealthService');
const EmergencyService = require('./EmergencyService');

class AIAgent {
  constructor(io = null) {
    this.io = io;
    this.memory = new Map();
    this.tools = this.initializeTools();
  }

  initializeTools() {
    return {
      setReminder: ReminderService.setReminder,
      checkHealth: HealthService.checkVitals.bind(HealthService), // ✅ Prevents "undefined.getHeartRate" error
      emergencyAlert: EmergencyService.triggerAlert,
      getWeather: this.getWeather.bind(this), // ✅ Will fallback to user profile location if missing
      scheduleMedication: this.scheduleMedication.bind(this),
      setPillReminder: ReminderService.setMedicationReminder,
      scheduleDoctor: async (params, user) => {
        return ReminderService.setReminder({
          description: 'Doctor appointment',
          datetime: params.datetime || new Date(Date.now() + 3600000),
          type: 'appointment'
        }, user);
      }
    };
  }

  async processMessage(message, userId, socket) {
    try {
      console.log('🧑 userId:', userId);
      const user = await UserModel.findById(userId);
      if (!user) throw new Error('User not found');
      console.log('✅ User found:', user.name);

      const trimmedMsg = message.trim().toLowerCase();

      if (['start new conversation', 'reset'].includes(trimmedMsg)) {
        this.memory.set(userId, []);
        await ConversationModel.deleteMany({ userId });

        return {
          response: '🧼 Alright! We’re starting a new conversation now.',
          emotion: 'neutral',
          actions: [],
          timestamp: new Date()
        };
      }

      const history = await this.getConversationHistory(userId);
      const analysis = await this.analyzeMessage(message, user);
      const aiReply = await this.generateResponse(message, history, user, analysis);
      const actions = await this.executeActions(aiReply.actions, user);

      await this.saveConversation(userId, message, aiReply.response);
      this.updateMemory(userId, message, aiReply.response);

      return {
        response: aiReply.response,
        emotion: analysis.emotion,
        actions,
        timestamp: new Date()
      };
    } catch (err) {
      console.error('❌ processMessage error:', err.message);
      return {
        response: "Sorry, I couldn't process that.",
        emotion: "confused",
        actions: [],
        timestamp: new Date()
      };
    }
  }

  async analyzeMessage(message, user) {
    const prompt = `
Analyze this message from an elderly user: "${message}"
User context: ${JSON.stringify(user.profile)}
Respond ONLY with JSON:
{
  "emotion": "happy|sad|worried|angry|neutral|confused",
  "intent": "health|medication|social|emergency|reminder|general",
  "urgency": "low|medium|high|critical",
  "keywords": [],
  "requiresAction": true/false,
  "suggestedActions": []
}
No explanation. No code blocks.`.trim();

    const raw = await this.queryGroq(prompt);
    console.log('🧠 Analysis raw output:\n', raw);

    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      console.error('❌ Failed to parse analysis JSON:', cleaned);
      throw new Error('Bad analysis response');
    }
  }

  async generateResponse(message, history, user, analysis) {
    const prompt = `
You are Empatha, a kind, simple-speaking AI for elderly care.

User profile: ${JSON.stringify(user.profile)}
Recent conversation: ${JSON.stringify(history.slice(-5))}
Analysis: ${JSON.stringify(analysis)}

Respond in JSON format:
{
  "response": "Your friendly helpful reply",
  "actions": [
    {
      "type": "setReminder",
      "params": {
        "description": "Take your pills",
        "datetime": "2025-06-25T16:20:00Z"
      }
    },
    {
      "type": "scheduleMedication",
      "params": {
        "name": "pills",
        "time": "2025-06-25T16:20:00Z",
        "frequency": "once"
      }
    }
  ]
}

✅ All datetime values must be ISO 8601 format (e.g., "2025-06-25T16:20:00Z").
✅ Only use the following action types:
- setReminder
- scheduleMedication
- emergencyAlert
- checkHealth
- getWeather

Do NOT include any unsupported types. Do not include code blocks.
`.trim();

    const raw = await this.queryGroq(prompt);
    console.log('🤖 Response raw output:\n', raw);

    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      console.error('❌ Failed to parse response JSON:', cleaned);
      throw new Error('Bad response format');
    }
  }

  async executeActions(actions, user) {
    const results = [];

    for (const act of actions || []) {
      const handler = this.tools[act.type];

      if (typeof handler !== 'function') {
        console.warn(`⚠️ Unsupported action type: ${act.type}`);
        results.push({
          action: act.type,
          success: false,
          error: `Unsupported action type: ${act.type}`
        });
        continue;
      }

      if (act.type === 'setReminder') {
        if (!act.params?.description || !act.params?.datetime) {
          results.push({
            action: act.type,
            success: false,
            error: 'Missing description or datetime for reminder.'
          });
          continue;
        }
      }

      if (act.type === 'scheduleMedication') {
        if (!act.params?.name || !act.params?.time) {
          results.push({
            action: act.type,
            success: false,
            error: 'Missing name or time for medication reminder.'
          });
          continue;
        }
      }

      try {
        const result = await handler(act.params, user);
        results.push({ action: act.type, success: true, result });
      } catch (err) {
        console.error(`❌ ${act.type} failed:`, err.message);
        results.push({ action: act.type, success: false, error: err.message });
      }
    }

    return results;
  }

  async getConversationHistory(userId) {
    return ConversationModel.find({ userId }).sort({ timestamp: -1 }).limit(10);
  }

  async saveConversation(userId, message, response) {
    await new ConversationModel({
      userId,
      userMessage: message,
      aiResponse: response,
      timestamp: new Date()
    }).save();
  }

  updateMemory(userId, message, response) {
    if (!this.memory.has(userId)) this.memory.set(userId, []);
    const mem = this.memory.get(userId);
    mem.push({ message, response, timestamp: new Date() });
    if (mem.length > 20) mem.shift();
  }

  async getWeather(params, user) {
    const location = params?.location || user?.profile?.location;

    if (!location) {
      throw new Error('Missing location. Please provide a location or add one to your profile.');
    }

    const res = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        q: location,
        appid: process.env.WEATHER_API_KEY,
        units: 'metric'
      }
    });

    return {
      location: res.data.name,
      temperature: res.data.main.temp,
      description: res.data.weather[0].description,
      humidity: res.data.main.humidity
    };
  }

  async scheduleMedication(params, user) {
    return ReminderService.setMedicationReminder(
      user._id,
      params.name,
      params.time,
      params.frequency
    );
  }

  async queryGroq(prompt) {
    try {
      const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama3-70b-8192',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return res.data.choices[0].message.content;
    } catch (error) {
      console.error('❌ queryGroq error:', error.response?.data || error.message);
      throw new Error('Groq API call failed');
    }
  }
}

module.exports = AIAgent;
