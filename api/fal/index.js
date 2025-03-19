// Standard Vercel API route structure
const axios = require('axios');

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
    
    // Log a small part of each image to verify format
    console.log('Start image format check (first 30 chars):', startImage.substring(0, 30));
    console.log('End image format check (first 30 chars):', finalImage.substring(0, 30));
    
    try {
      // FAL.ai endpoint - as per documentation
      const falEndpoint = 'https://api.fal.ai/models/fal-ai/vidu/start-end-to-video';
      console.log('Using FAL.ai endpoint:', falEndpoint);
      
      // Determine if images are URLs or base64 data
      const isBase64 = startImage.startsWith('data:');
      
      // Prepare payload according to FAL.ai documentation
      let payload = {
        prompt: "Show a natural transition between these images",
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
      
      console.log('Prepared payload structure:', Object.keys(payload).join(', '));
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
        'Accept': 'application/json'
      };
      
      console.log('Sending request to FAL.ai...');
      
      // Create a custom axios instance with extended timeout
      const axiosInstance = axios.create({
        timeout: 180000, // 3 minute timeout
      });
      
      // Make the API request according to FAL.ai documentation
      const response = await axiosInstance.post(falEndpoint, payload, { 
        headers,
      });
      
      console.log('FAL.ai response received with status:', response.status);
      console.log('Response data structure:', Object.keys(response.data).join(', '));
      
      // Check if response has the video URL in the format from the documentation
      if (response.data && response.data.video && response.data.video.url) {
        console.log('Found video URL in response.data.video.url');
        return res.json({ 
          output: { 
            video: response.data.video.url 
          } 
        });
      } else if (response.data && response.data.video_url) {
        // Fallback for older API response format
        console.log('Found video URL in response.data.video_url');
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
      if (axiosError.code === 'ECONNABORTED') {
        return res.status(504).json({
          error: true,
          message: 'Request to FAL.ai timed out. Please try again.'
        });
      }
      
      if (axiosError.code === 'ENOTFOUND') {
        return res.status(503).json({
          error: true, 
          message: 'Could not resolve FAL.ai hostname. Please check your network connection.'
        });
      }
      
      if (axiosError.response) {
        console.error('API error response:', JSON.stringify(axiosError.response.data).substring(0, 200));
        
        // Handle specific error codes
        if (axiosError.response.status === 401) {
          return res.status(401).json({ 
            error: true,
            message: 'Invalid API key. Please check your FAL.ai API key.'
          });
        }
        
        return res.status(axiosError.response.status).json({
          error: true,
          message: axiosError.response.data.message || 'Error from FAL.ai API'
        });
      }
      
      // If we reach here, it's a network error without a response
      return res.status(500).json({
        error: true,
        message: 'No response received from FAL.ai API. Please check your network connection.'
      });
    }
  } catch (error) {
    console.error('General error in proxy request:', error.message);
    return res.status(500).json({
      error: true,
      message: error.message || 'Unknown error occurred'
    });
  }
};