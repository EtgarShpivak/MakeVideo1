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

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Received request to generate video');
    const { images, apiKey } = req.body;
    
    if (!apiKey) {
      console.log('API key missing');
      return res.status(400).json({ error: 'API key is required' });
    }
    
    if (!images || images.length < 2) {
      console.log('Not enough images provided');
      return res.status(400).json({ error: 'At least 2 images are required' });
    }
    
    console.log(`Processing request with ${images.length} images`);
    
    // Get first and last images
    const startImage = images[0];
    const finalImage = images[images.length - 1];
    
    // Validate image format
    if (!startImage || !finalImage) {
      return res.status(400).json({ error: 'Invalid image data provided' });
    }
    
    // Log a small part of each image to verify format
    try {
      console.log('Start image format check (first 30 chars):', startImage.substring(0, 30));
      console.log('End image format check (first 30 chars):', finalImage.substring(0, 30));
    } catch (e) {
      console.error('Error checking image format:', e.message);
      return res.status(400).json({ error: 'Invalid image format' });
    }
    
    // Validate base64 images
    if (startImage.startsWith('data:')) {
      if (!isValidBase64Image(startImage) || !isValidBase64Image(finalImage)) {
        return res.status(400).json({ error: 'Invalid image format. Images must be valid base64 encoded JPG or PNG.' });
      }
    }
    
    try {
      // FAL.ai direct request using their recommended format
      const falEndpoint = 'https://api.fal.ai/models/fal-ai/vidu/start-end-to-video';
      console.log('Using FAL.ai endpoint:', falEndpoint);
      
      // Determine if images are URLs or base64 data
      const isBase64 = startImage.startsWith('data:');
      
      // Create a unique request ID
      const requestId = generateUUID();
      
      // Prepare payload according to FAL.ai documentation
      let payload = {
        prompt: "Show a natural transition between these images",
        seed: Math.floor(Math.random() * 1000000) // Random seed for better results
      };
      
      // Add images according to whether they're URLs or base64 data
      if (isBase64) {
        console.log('Using base64 image format');
        payload.start_image = startImage;
        payload.end_image = finalImage;
      } else {
        console.log('Using URL image format');
        payload.start_image_url = startImage;
        payload.end_image_url = finalImage;
      }
      
      console.log('Prepared payload with request ID:', requestId);
      
      // Configure the request with a longer timeout
      const agent = new https.Agent({
        keepAlive: true,
        timeout: 60000, // 60 second socket timeout
        rejectUnauthorized: true // Ensure SSL verification
      });
      
      // Set up headers with the API key
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
        'Accept': 'application/json',
        'User-Agent': 'BarMitzvahVideoGenerator/1.0'
      };
      
      console.log('Sending request to FAL.ai...');
      
      // Make the API request with proper error handling
      try {
        const response = await axios({
          method: 'POST',
          url: falEndpoint,
          data: payload,
          headers: headers,
          httpsAgent: agent,
          timeout: 180000, // 3 minute request timeout
          validateStatus: status => status < 500, // Only treat 500+ as errors
          maxContentLength: 100 * 1024 * 1024, // 100MB max response size
          maxBodyLength: 100 * 1024 * 1024 // 100MB max request size
        });
        
        console.log(`FAL.ai response received with status: ${response.status}`);
        
        // Handle non-200 responses
        if (response.status !== 200) {
          console.error('Error response:', response.status, response.data);
          return res.status(response.status).json({
            error: true,
            message: response.data?.message || `Error from FAL.ai API (${response.status})`
          });
        }
        
        // Log response structure
        console.log('Response data keys:', Object.keys(response.data).join(', '));
        
        // Check response format
        if (response.data && response.data.video && response.data.video.url) {
          console.log('Found video URL in video.url field');
          return res.json({ 
            output: { 
              video: response.data.video.url 
            } 
          });
        } else if (response.data && response.data.video_url) {
          console.log('Found video URL in video_url field');
          return res.json({ 
            output: { 
              video: response.data.video_url 
            } 
          });
        } else {
          console.error('Invalid response structure:', JSON.stringify(response.data).substring(0, 200));
          return res.status(500).json({
            error: true,
            message: 'Invalid response structure from FAL.ai API'
          });
        }
      } catch (axiosError) {
        console.error('Error in axios request:', axiosError.message);
        
        // Detailed error logging
        if (axiosError.code) {
          console.error('Error code:', axiosError.code);
        }
        
        if (axiosError.response) {
          console.error('Response status:', axiosError.response.status);
          console.error('Response headers:', JSON.stringify(axiosError.response.headers));
          try {
            console.error('Response data:', JSON.stringify(axiosError.response.data).substring(0, 200));
          } catch (e) {
            console.error('Could not stringify response data');
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
                    `Error ${axiosError.response.status} from FAL.ai API`
          });
        } else if (axiosError.request) {
          // The request was made but no response was received
          console.error('No response received - request details:');
          console.error('Request URL:', axiosError.config?.url);
          console.error('Request method:', axiosError.config?.method);
          
          // Handle specific network errors
          if (axiosError.code === 'ECONNABORTED') {
            return res.status(504).json({
              error: true,
              message: 'Request to FAL.ai timed out after 3 minutes. The service might be experiencing high load.'
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
          console.error('Error setting up request:', axiosError.message);
          return res.status(500).json({
            error: true,
            message: `Error setting up request: ${axiosError.message}`
          });
        }
      }
    } catch (apiError) {
      console.error('API processing error:', apiError.message);
      return res.status(500).json({
        error: true,
        message: `Error processing API request: ${apiError.message}`
      });
    }
  } catch (error) {
    console.error('General error in proxy request:', error.message);
    console.error(error.stack);
    return res.status(500).json({
      error: true,
      message: error.message || 'Unknown error occurred'
    });
  }
};