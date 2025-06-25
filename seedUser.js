// seedUser.js
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/empatha', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  await User.create({
    _id: '59b99db4cfa9a34dcd7885b6',
    name: 'Ned Stark',
    email: 'ned@winterfell.com',
    password: 'dummyhash',
    profile: {
      age: 70,
      location: 'Winterfell',
      conditions: ['Arthritis']
    }
  });

  console.log('✅ Dummy user inserted.');
  process.exit();
}).catch(err => {
  console.error('❌ Insert failed:', err.message);
});
