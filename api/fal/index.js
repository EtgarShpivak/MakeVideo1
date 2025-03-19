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
    
    // Make the API request according to FAL.ai documentation
    const response = await axios.post(falEndpoint, payload, { 
      headers,
      timeout: 60000 // 60 second timeout
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
  } catch (error) {
    console.error('Error in proxy request:', error.message);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // outside of the range of 2xx
      console.error('Error status:', error.response.status);
      console.error('Error response data:', JSON.stringify(error.response.data).substring(0, 200));
      
      // Check if there's a specific error message in the response
      let errorMessage = 'API error';
      if (error.response.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      }
      
      return res.status(error.response.status).json({
        error: true,
        message: errorMessage
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from API');
      return res.status(500).json({
        error: true,
        message: 'No response received from FAL.ai API'
      });
    } else {
      // Something happened in setting up the request
      console.error('Error setting up request:', error.message);
      return res.status(500).json({
        error: true,
        message: error.message
      });
    }
  }
};