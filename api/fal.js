const axios = require('axios');
const https = require('https');

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
    const { images, apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }
    
    if (!images || images.length < 2) {
      return res.status(400).json({ error: 'At least 2 images are required' });
    }
    
    console.log(`Processing request with ${images.length} images`);
    
    // Create custom HTTPS agent with longer timeout and keepAlive
    const agent = new https.Agent({
      keepAlive: true,
      timeout: 60000,
      rejectUnauthorized: false
    });
    
    // FAL.ai endpoint
    const falEndpoint = 'https://api.fal.ai/models/fal-ai/vidu/start-end-to-video';
    
    // First and last image from the array
    const startImage = images[0];
    const finalImage = images[images.length - 1];
    
    const payload = {
      start_image: startImage,
      final_image: finalImage,
      prompt: "Show a natural transition between these images",
      video_length: 5
    };
    
    console.log('Sending request to FAL.ai...');
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Key ${apiKey}`,
      'Accept': 'application/json'
    };
    
    // Make the API request with increased timeout and custom agent
    const response = await axios.post(falEndpoint, payload, { 
      headers,
      timeout: 180000, // 3 minute timeout
      httpsAgent: agent,
      proxy: false // Bypass any system proxy
    });
    
    console.log('FAL.ai response received successfully');
    
    if (response.data && response.data.video_url) {
      return res.json({ 
        output: { 
          video: response.data.video_url 
        } 
      });
    } else {
      console.error('Invalid response structure:', response.data);
      return res.status(500).json({
        error: true,
        message: 'Invalid response structure from FAL.ai API'
      });
    }
  } catch (error) {
    console.error('Error in proxy request:', error.message);
    
    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      return res.status(503).json({
        error: true,
        message: 'DNS resolution failed. Cannot connect to FAL.ai API. Please try again later.'
      });
    }
    
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: true,
        message: 'Connection to FAL.ai API timed out. Please try again later.'
      });
    }
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // outside of the range of 2xx
      console.error('Error response data:', error.response.data);
      return res.status(error.response.status).json({
        error: true,
        message: error.response.data
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received');
      return res.status(500).json({
        error: true,
        message: 'No response received from FAL.ai API'
      });
    } else {
      // Something happened in setting up the request
      return res.status(500).json({
        error: true,
        message: error.message
      });
    }
  }
}; 