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
      setReminder: ReminderService.setReminder.bind(ReminderService),
      checkHealth: HealthService.checkVitals.bind(HealthService),
      emergencyAlert: EmergencyService.triggerAlert.bind(EmergencyService),
      getWeather: this.getWeather.bind(this),
      scheduleMedication: this.scheduleMedication.bind(this),
      setPillReminder: ReminderService.setMedicationReminder.bind(ReminderService),
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
      let user = null;
      try {
        user = await UserModel.findById(userId);
      } catch (e) {
        console.warn('⚠️ MongoDB not connected or user query failed.');
      }
      if (!user) {
        console.warn(`⚠️ User ${userId} not found in DB. Using default profile.`);
        user = {
          _id: userId,
          name: 'Friend',
          profile: { location: 'Unknown', healthConditions: [] }
        };
      } else {
        console.log('✅ User found:', user.name);
      }

      const trimmedMsg = message.trim().toLowerCase();
      if (['start new conversation', 'reset'].includes(trimmedMsg)) {
        this.memory.set(userId, []);
        await ConversationModel.deleteMany({ userId });
        return {
          response: '🧼 Starting fresh! How can I help you?',
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
        response: "I'm here for you. Could you say that again?",
        emotion: 'caring',
        actions: [],
        timestamp: new Date()
      };
    }
  }

  async analyzeMessage(message, user) {
    const prompt = `
Analyze this message from an elderly user: "${message}"
User context: ${JSON.stringify(user.profile || {})}
You MUST respond with ONLY valid JSON data and nothing else. Do not use markdown blocks.
{
  "emotion": "happy|sad|worried|angry|neutral|confused",
  "intent": "health|medication|social|emergency|reminder|general",
  "urgency": "low|medium|high|critical",
  "keywords": [],
  "requiresAction": false,
  "suggestedActions": []
}`.trim();

    const raw = await this.queryGroq(prompt, true);
    try {
      const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.error('❌ Failed to parse analysis JSON:', raw);
      return {
        emotion: 'neutral',
        intent: 'general',
        urgency: 'low',
        keywords: [],
        requiresAction: false,
        suggestedActions: []
      };
    }
  }

  async generateResponse(message, history, user, analysis) {
    const mem = this.memory.get(user._id) || [];
    const memoryString = JSON.stringify(mem);

    const prompt = `
You are Empatha, a kind, simple-speaking AI companion for elderly care.

User profile: ${JSON.stringify(user.profile || {})}
Message analysis: ${JSON.stringify(analysis)}
Recent conversation memory: ${memoryString}
User message: "${message}"

You MUST respond with ONLY valid JSON data and nothing else. Do not use markdown blocks.
{
  "response": "Your friendly helpful reply here",
  "actions": []
}

Only add actions if truly needed. Supported action types: setReminder, scheduleMedication, emergencyAlert, checkHealth, getWeather.
All datetime values must be ISO 8601 format.`.trim();

    const raw = await this.queryGroq(prompt, true);
    try {
      const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.error('❌ Failed to parse response JSON:', raw);
      return {
        response: "I'm here to help. Can you tell me more?",
        actions: []
      };
    }
  }

  async executeActions(actions, user) {
    const results = [];
    for (const act of actions || []) {
      const handler = this.tools[act.type];
      if (typeof handler !== 'function') {
        console.warn(`⚠️ Unsupported action type: ${act.type}`);
        continue;
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
    try {
      return await ConversationModel.find({ userId }).sort({ timestamp: -1 }).limit(10);
    } catch (e) {
      console.warn('⚠️ Could not fetch history from DB. Using local memory.');
      return [];
    }
  }

  async saveConversation(userId, message, response) {
    try {
      await new ConversationModel({
        userId,
        userMessage: message,
        aiResponse: response,
        timestamp: new Date()
      }).save();
    } catch (e) {
      console.warn('⚠️ Could not save conversation to DB:', e.message);
    }
  }

  updateMemory(userId, message, response) {
    if (!this.memory.has(userId)) this.memory.set(userId, []);
    const mem = this.memory.get(userId);
    mem.push({ role: 'user', content: message });
    mem.push({ role: 'assistant', content: response });
    if (mem.length > 10) mem.splice(0, mem.length - 10);
  }

  async getWeather(params, user) {
    const location = params?.location || user?.profile?.location;
    if (!location) throw new Error('Missing location');

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

  async queryGroq(prompt, formatAsJson = false) {
    try {
      const payload = {
        model: 'llama3-8b-8192',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.5,
        max_tokens: 500
      };

      if (formatAsJson) {
        payload.response_format = { type: 'json_object' };
      }

      const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        payload,
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return res.data.choices[0].message.content;
    } catch (error) {
      console.error('❌ queryGroq error:', JSON.stringify(error.response?.data) || error.message);
      throw new Error('Groq API call failed');
    }
  }
}

module.exports = AIAgent;
