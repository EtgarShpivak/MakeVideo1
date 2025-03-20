// Standard Vercel API route structure
const axios = require('axios');
const https = require('https');

// Simple UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Check if a string is a valid base64 image
function isValidBase64Image(str) {
  return typeof str === 'string' && 
         (str.startsWith('data:image/jpeg;base64,') || 
          str.startsWith('data:image/png;base64,') ||
          str.startsWith('data:image/jpg;base64,'));
}

// FOR DEBUGGING ONLY: Check if this is a test request
function isTestRequest(req) {
  return req.query.test === 'true' || req.query.debug === 'true';
}

const FAL_API_URL = 'https://api.fal.ai/v1/kling-1.6';

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { prompt, image1, image2, apiKey } = req.body;

    if (!prompt || !image1 || !image2 || !apiKey) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    // Log request details for debugging
    console.log('Making request to FAL API with:', {
      promptLength: prompt.length,
      image1Length: image1.length,
      image2Length: image2.length,
      apiKeyPresent: !!apiKey
    });

    const response = await axios.post(
      'https://api.fal.ai/v1/video-generation',
      {
        prompt,
        image1: image1,
        image2: image2,
        model: 'kling-1.6',
        duration: 4,
        aspect_ratio: '16:9'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 30000
      }
    );

    if (!response.data || !response.data.url) {
      throw new Error('Invalid response from FAL API');
    }

    res.status(200).json({ url: response.data.url });
  } catch (error) {
    console.error('FAL API Error:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.error?.message || error.message || 'Internal server error';
    res.status(status).json({ error: message });
  }
};