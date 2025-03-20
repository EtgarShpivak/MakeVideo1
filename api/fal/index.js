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
    
    const { prompt, image1, image2, apiKey } = req.body;
    
    if (!prompt || !image1 || !image2 || !apiKey) {
      console.log('[ERROR] Missing required parameters');
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    if (!image1.data || !image2.data) {
      console.log('[ERROR] Missing image data');
      return res.status(400).json({ error: 'Missing image data' });
    }
    
    console.log(`[INFO] Processing request with images: ${image1}, ${image2}`);
    
    // Validate image format
    if (!image1) {
      console.log('[ERROR] Invalid image data provided - null or undefined image');
      return res.status(400).json({ error: 'Invalid image data provided' });
    }
    
    // Default prompt if none provided
    const videoPrompt = prompt || "A cinematic time-lapse showing progression";
    const videoDuration = 4; // Default to 4 seconds
    const videoAspectRatio = '16:9'; // Default aspect ratio
    
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
      // Get base64 data without the prefix
      const getBase64Data = (imageData) => {
        if (typeof imageData !== 'string') {
          throw new Error('Invalid image data format');
        }
        return imageData.startsWith('data:image/') ? imageData.split(',')[1] : imageData;
      };

      // Process images
      let image1Base64, image2Base64;
      try {
        image1Base64 = getBase64Data(image1.data);
        image2Base64 = getBase64Data(image2.data);
      } catch (imageError) {
        console.error('Error processing images:', imageError);
        return res.status(400).json({ error: `Invalid image data: ${imageError.message}` });
      }

      // Prepare FAL API request
      const requestData = {
        prompt,
        image1: image1Base64,
        image2: image2Base64,
        duration: videoDuration.toString(),
        aspect_ratio: videoAspectRatio
      };

      // Make request to FAL API
      const response = await axios.post(FAL_API_URL, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 30000,
        validateStatus: (status) => status === 200
      });

      if (!response.data?.video_url) {
        throw new Error('Invalid response format from FAL API');
      }

      return res.status(200).json({ videoUrl: response.data.video_url });
    } catch (apiError) {
      console.error('FAL API error:', apiError);

      if (axios.isAxiosError(apiError)) {
        const status = apiError.response?.status || 500;
        const errorMessage = apiError.response?.data?.error?.message ||
                           apiError.response?.data?.error ||
                           apiError.message ||
                           'FAL API error';

        return res.status(status).json({ error: errorMessage });
      }

      return res.status(500).json({ error: apiError.message || 'Unexpected error calling FAL API' });
    }
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};