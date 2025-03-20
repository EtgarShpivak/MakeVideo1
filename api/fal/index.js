// Standard Vercel API route structure
import axios from 'axios';
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

const FAL_API_URL = 'https://api.fal.ai/v1/video-generation';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  
  // Handle OPTIONS request (pre-flight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Special handling for GET requests - useful for health checks/testing
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'ok',
      message: 'FAL.ai Proxy API is running. Use POST method to generate videos.',
      timestamp: new Date().toISOString()
    });
  }

  // Only allow POST requests beyond this point
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[DEBUG] Received request to generate video');
    console.log('[DEBUG] Request headers:', JSON.stringify(req.headers));
    
    // Safely log body without logging the actual API key
    const reqBodySafe = { ...req.body };
    if (reqBodySafe.apiKey) reqBodySafe.apiKey = '***REDACTED***';
    console.log('[DEBUG] Request body:', JSON.stringify(reqBodySafe));
    
    const { image1, image2, prompt, apiKey, model, duration, aspect_ratio } = req.body;
    
    if (!image1 || !image2 || !prompt || !apiKey) {
      console.log('[ERROR] Missing required parameters');
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    console.log(`[INFO] Processing request with images: ${image1}, ${image2}`);
    
    // Validate image format
    if (!image1) {
      console.log('[ERROR] Invalid image data provided - null or undefined image');
      return res.status(400).json({ error: 'Invalid image data provided' });
    }
    
    // Default prompt if none provided
    const videoPrompt = prompt || "A cinematic time-lapse showing progression";
    const videoDuration = duration || 4; // Default to 4 seconds
    const videoAspectRatio = aspect_ratio || "16:9"; // Default aspect ratio
    
    // Log a small part of the image to verify format
    try {
      console.log('[DEBUG] Start image format check (first 30 chars):', typeof image1 === 'string' ? image1.substring(0, 30) : typeof image1);
      if (image2) {
        console.log('[DEBUG] Tail image format check (first 30 chars):', typeof image2 === 'string' ? image2.substring(0, 30) : typeof image2);
      }
      console.log('[DEBUG] Using prompt:', videoPrompt);
      console.log('[DEBUG] Using duration:', videoDuration);
      console.log('[DEBUG] Using aspect ratio:', videoAspectRatio);
    } catch (e) {
      console.error('[ERROR] Error checking image format:', e.message);
      return res.status(400).json({ error: 'Invalid image format: ' + e.message });
    }
    
    // Validate base64 images
    if (typeof image1 === 'string' && image1.startsWith('data:')) {
      if (!isValidBase64Image(image1)) {
        console.log('[ERROR] Invalid base64 image format for start image');
        return res.status(400).json({ error: 'Invalid image format. Start image must be a valid base64 encoded JPG or PNG.' });
      }
      
      if (image2 && typeof image2 === 'string' && image2.startsWith('data:') && !isValidBase64Image(image2)) {
        console.log('[ERROR] Invalid base64 image format for tail image');
        return res.status(400).json({ error: 'Invalid image format. Tail image must be a valid base64 encoded JPG or PNG.' });
      }
    }
    
    // FOR TESTING: If this is a test request, return mock data
    if (isTestRequest(req)) {
      console.log('[INFO] Test request detected - returning mock response');
      setTimeout(() => {
        return res.json({
          output: {
            video: 'https://example.com/mock-video.mp4'
          },
          mockResponse: true,
          message: 'This is a test response, not a real video URL'
        });
      }, 2000); // 2 second delay to simulate API call
      return;
    }
    
    try {
      const requestData = {
        image1,
        image2,
        prompt: videoPrompt,
        model: model || 'kling-1.6',
        duration: videoDuration.toString(),
        aspect_ratio: videoAspectRatio
      };

      const response = await axios.post(FAL_API_URL, requestData, {
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      res.status(200).json({ video_url: response.data.video_url });
    } catch (error) {
      console.error('FAL.ai API error:', error);
      res.status(500).json({ 
        error: error.response?.data?.error || error.message || 'Internal server error'
      });
    }
  } catch (error) {
    console.error('[ERROR] General error in proxy request:', error.message);
    console.error('[ERROR] Error stack:', error.stack);
    return res.status(500).json({
      error: true,
      message: error.message || 'Unknown error occurred'
    });
  }
}