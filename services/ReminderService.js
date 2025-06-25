const cron = require('node-cron');
const ReminderModel = require('../models/Reminder');

let ioInstance = null;

// ✅ Store Socket.IO instance
function initialize(io) {
  ioInstance = io;
}

// ✅ Start checking reminders every minute
function startReminderCheck() {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const nextMinute = new Date(now.getTime() + 60000);

      const reminders = await ReminderModel.find({
        scheduledTime: { $gte: now, $lt: nextMinute },
        sent: { $ne: true } // Only unsent reminders
      });

      for (const reminder of reminders) {
        console.log(`🔔 Emitting reminder for user ${reminder.userId}`);

        if (ioInstance) {
          ioInstance.emit('reminder', {
            userId: reminder.userId.toString(),
            message: reminder.description
          });
        }

        reminder.sent = true;
        await reminder.save();
      }
    } catch (error) {
      console.error('❌ Error in reminder check:', error.message);
    }
  });
}

// ✅ Set a generic reminder
async function setReminder(params, user) {
  if (!params.description || !params.datetime) {
    throw new Error('Description and datetime are required for a reminder.');
  }

  const reminder = new ReminderModel({
    userId: user._id,
    description: params.description,
    scheduledTime: new Date(params.datetime),
    type: params.type || 'general',
    sent: false
  });

  await reminder.save();
  return { status: 'scheduled', time: reminder.scheduledTime };
}

// ✅ Set a medication reminder
async function setMedicationReminder(userId, name, time, frequency = 'once') {
  if (!name || !time) {
    throw new Error('Medication name and time are required.');
  }

  const reminder = new ReminderModel({
    userId,
    description: `Take your medication: ${name}`,
    scheduledTime: new Date(time),
    type: 'medication',
    frequency,
    sent: false
  });

  await reminder.save();
  return {
    status: 'scheduled',
    medication: name,
    time: reminder.scheduledTime,
    frequency
  };
}

module.exports = {
  initialize,
  startReminderCheck,
  setReminder,
  setMedicationReminder
};
