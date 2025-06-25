// services/EmergencyService.js
class EmergencyService {
  static async triggerAlert(params, user) {
    // Example: send alert to emergency contacts
    console.log(`EMERGENCY ALERT for ${user.name}: ${params.message || 'Unknown issue'}`);
    return {
      status: 'alert_sent',
      contacts: user.profile?.emergencyContacts || []
    };
  }
}

module.exports = EmergencyService;
