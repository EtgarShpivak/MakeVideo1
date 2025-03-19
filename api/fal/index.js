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

module.exports = async (req, res) => {
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
    
    const { images, apiKey, prompt, negativePrompt, duration, aspectRatio } = req.body;
    
    if (!apiKey) {
      console.log('[ERROR] API key missing');
      return res.status(400).json({ error: 'API key is required' });
    }
    
    if (!images || images.length < 1) {
      console.log('[ERROR] No images provided');
      return res.status(400).json({ error: 'At least 1 image is required' });
    }
    
    console.log(`[INFO] Processing request with ${images.length} images`);
    
    // Get the first image (for Kling model start image)
    const startImage = images[0];
    
    // Get the second image if available (for Kling model tail image)
    const tailImage = images.length >= 2 ? images[1] : null;
    
    // Validate image format
    if (!startImage) {
      console.log('[ERROR] Invalid image data provided - null or undefined image');
      return res.status(400).json({ error: 'Invalid image data provided' });
    }
    
    // Default prompt if none provided
    const videoPrompt = prompt || "A cinematic time-lapse showing progression";
    const videoDuration = duration || 5; // Default to 5 seconds
    const videoAspectRatio = aspectRatio || "16:9"; // Default aspect ratio
    
    // Log a small part of the image to verify format
    try {
      console.log('[DEBUG] Start image format check (first 30 chars):', typeof startImage === 'string' ? startImage.substring(0, 30) : typeof startImage);
      if (tailImage) {
        console.log('[DEBUG] Tail image format check (first 30 chars):', typeof tailImage === 'string' ? tailImage.substring(0, 30) : typeof tailImage);
      }
      console.log('[DEBUG] Using prompt:', videoPrompt);
      if (negativePrompt) {
        console.log('[DEBUG] Using negative prompt:', negativePrompt);
      }
      console.log('[DEBUG] Using duration:', videoDuration);
      console.log('[DEBUG] Using aspect ratio:', videoAspectRatio);
    } catch (e) {
      console.error('[ERROR] Error checking image format:', e.message);
      return res.status(400).json({ error: 'Invalid image format: ' + e.message });
    }
    
    // Validate base64 images
    if (typeof startImage === 'string' && startImage.startsWith('data:')) {
      if (!isValidBase64Image(startImage)) {
        console.log('[ERROR] Invalid base64 image format for start image');
        return res.status(400).json({ error: 'Invalid image format. Start image must be a valid base64 encoded JPG or PNG.' });
      }
      
      if (tailImage && typeof tailImage === 'string' && tailImage.startsWith('data:') && !isValidBase64Image(tailImage)) {
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
      // Use the Kling 1.6 Image to Video model
      const falEndpoint = 'https://api.fal.ai/models/fal-ai/kling-video/v1.6/pro/image-to-video';
      console.log('[INFO] Using FAL.ai endpoint:', falEndpoint);
      
      // Determine if image is URL or base64 data
      const isStartBase64 = typeof startImage === 'string' && startImage.startsWith('data:');
      const isTailBase64 = tailImage && typeof tailImage === 'string' && tailImage.startsWith('data:');
      
      // Create a unique request ID
      const requestId = generateUUID();
      
      // Prepare payload according to Kling model documentation
      let payload = {
        prompt: videoPrompt,
        duration: videoDuration.toString(),
        aspect_ratio: videoAspectRatio
      };
      
      // Add negative prompt if provided
      if (negativePrompt && negativePrompt.trim() !== '') {
        payload.negative_prompt = negativePrompt;
      }
      
      // Add start image according to whether it's URL or base64 data
      if (isStartBase64) {
        console.log('[INFO] Using base64 image format for start image');
        payload.image = startImage; // For base64, use 'image' field
      } else {
        console.log('[INFO] Using URL image format for start image');
        payload.image_url = startImage;
      }
      
      // Add tail image if available
      if (tailImage) {
        if (isTailBase64) {
          console.log('[INFO] Using base64 image format for tail image');
          payload.tail_image = tailImage; // For base64, use 'tail_image' field
        } else {
          console.log('[INFO] Using URL image format for tail image');
          payload.tail_image_url = tailImage;
        }
      }
      
      console.log('[INFO] Prepared payload with request ID:', requestId);
      console.log('[DEBUG] Payload keys:', Object.keys(payload).join(', '));
      
      // Configure the request with a longer timeout
      const agent = new https.Agent({
        keepAlive: true,
        timeout: 360000, // 6 minute socket timeout (Kling takes longer)
        rejectUnauthorized: true // Ensure SSL verification
      });
      
      // Set up headers with the API key
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
        'Accept': 'application/json',
        'User-Agent': 'BarMitzvahVideoGenerator/1.0'
      };
      
      console.log('[INFO] Sending request to FAL.ai...');
      
      // Make the API request with proper error handling
      try {
        console.log('[DEBUG] Making axios request to:', falEndpoint);
        
        const response = await axios({
          method: 'POST',
          url: falEndpoint,
          data: payload,
          headers: headers,
          httpsAgent: agent,
          timeout: 360000, // 6 minute request timeout for Kling
          validateStatus: status => status < 500, // Only treat 500+ as errors
          maxContentLength: 100 * 1024 * 1024, // 100MB max response size
          maxBodyLength: 100 * 1024 * 1024 // 100MB max request size
        });
        
        console.log(`[INFO] FAL.ai response received with status: ${response.status}`);
        
        // Handle non-200 responses
        if (response.status !== 200) {
          console.error('[ERROR] Error response from FAL.ai:', response.status);
          try {
            console.error('[ERROR] Error details:', JSON.stringify(response.data));
          } catch (e) {
            console.error('[ERROR] Could not stringify response data');
          }
          
          return res.status(response.status).json({
            error: true,
            message: response.data?.message || response.data?.error || `Error from FAL.ai API (${response.status})`
          });
        }
        
        // Log response structure
        console.log('[DEBUG] Response data keys:', Object.keys(response.data).join(', '));
        
        // Check response format for Kling model
        if (response.data && response.data.video && response.data.video.url) {
          console.log('[INFO] Found video URL in video.url field');
          return res.json({ 
            output: { 
              video: response.data.video.url 
            } 
          });
        } else {
          console.error('[ERROR] Invalid response structure:', JSON.stringify(response.data).substring(0, 500));
          return res.status(500).json({
            error: true,
            message: 'Invalid response structure from FAL.ai API'
          });
        }
      } catch (axiosError) {
        console.error('[ERROR] Error in axios request:', axiosError.message);
        console.error('[ERROR] Error stack:', axiosError.stack);
        
        // Detailed error logging
        if (axiosError.code) {
          console.error('[ERROR] Error code:', axiosError.code);
        }
        
        if (axiosError.response) {
          console.error('[ERROR] Response status:', axiosError.response.status);
          console.error('[ERROR] Response headers:', JSON.stringify(axiosError.response.headers));
          try {
            console.error('[ERROR] Response data:', JSON.stringify(axiosError.response.data).substring(0, 500));
          } catch (e) {
            console.error('[ERROR] Could not stringify response data');
          }
          
          // Check for specific error messages
          if (axiosError.response.status === 401 || 
              (axiosError.response.data && axiosError.response.data.detail && 
              axiosError.response.data.detail.includes('authentication'))) {
            return res.status(401).json({
              error: true,
              message: 'Invalid API key. Please check your FAL.ai API key.'
            });
          }
          
          // Return the actual error from the API
          return res.status(axiosError.response.status).json({
            error: true,
            message: axiosError.response.data?.message || 
                    axiosError.response.data?.detail ||
                    axiosError.response.data?.error ||
                    `Error ${axiosError.response.status} from FAL.ai API`
          });
        } else if (axiosError.request) {
          // The request was made but no response was received
          console.error('[ERROR] No response received - request details:');
          console.error('[ERROR] Request URL:', axiosError.config?.url);
          console.error('[ERROR] Request method:', axiosError.config?.method);
          console.error('[ERROR] Request headers:', JSON.stringify(axiosError.config?.headers || {}).replace(/"Authorization":"[^"]+"/g, '"Authorization":"REDACTED"'));
          
          // Handle specific network errors
          if (axiosError.code === 'ECONNABORTED') {
            return res.status(504).json({
              error: true,
              message: 'Request to FAL.ai timed out after 6 minutes. The Kling model takes longer to generate videos - please try again.'
            });
          } else if (axiosError.code === 'ENOTFOUND') {
            return res.status(503).json({
              error: true, 
              message: 'Could not resolve FAL.ai hostname. DNS resolution failed.'
            });
          } else {
            return res.status(500).json({
              error: true,
              message: `Network error: ${axiosError.code || 'No response received from FAL.ai API'}`
            });
          }
        } else {
          // Something happened in setting up the request
          console.error('[ERROR] Error setting up request:', axiosError.message);
          return res.status(500).json({
            error: true,
            message: `Error setting up request: ${axiosError.message}`
          });
        }
      }
    } catch (apiError) {
      console.error('[ERROR] API processing error:', apiError.message);
      console.error('[ERROR] API processing error stack:', apiError.stack);
      return res.status(500).json({
        error: true,
        message: `Error processing API request: ${apiError.message}`
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
};