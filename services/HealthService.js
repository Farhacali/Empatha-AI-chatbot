class HealthService {
  static async checkVitals(params, user) {
    return {
      heartRate: await this.getHeartRate(user),
      bloodPressure: await this.getBloodPressure(user),
      steps: await this.getSteps(user),
      recommendations: await this.generateHealthRecommendations(user)
    };
  }

  static async getHeartRate(user) {
    // Simulated heart rate: 60–100 BPM
    return Math.floor(Math.random() * 41) + 60;
  }

  static async getBloodPressure(user) {
    // Simulated systolic/diastolic pressure
    return {
      systolic: Math.floor(Math.random() * 21) + 100,  // 100–120
      diastolic: Math.floor(Math.random() * 11) + 70   // 70–80
    };
  }

  static async getSteps(user) {
    // Simulated steps for the day
    return Math.floor(Math.random() * 4001) + 2000; // 2000–6000 steps
  }

  static async generateHealthRecommendations(user) {
    // Simple static recommendations for demo
    return [
      "Take a 10-minute walk",
      "Drink a glass of water",
      "Practice deep breathing for 5 minutes"
    ];
  }
}

module.exports = HealthService;
