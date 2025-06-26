// utils/emotion.js

const { pipeline } = require('@xenova/transformers');

let classifier;

// Load the classifier once
async function loadClassifier() {
  if (!classifier) {
    console.log('⏳ Loading emotion detection model...');
    classifier = await pipeline('text-classification', 'Xenova/emotion-distilroberta-base', {
      quantized: true,
    });
    console.log('✅ Emotion model loaded');
  }
  return classifier;
}

// Detect the emotion of a given text
async function detectEmotion(text) {
  const model = await loadClassifier();
  const result = await model(text, { topk: 1 });
  return result[0].label.toLowerCase(); // returns: joy, sadness, anger, etc.
}

module.exports = { detectEmotion };
