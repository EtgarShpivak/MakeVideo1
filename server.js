const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS for all routes
app.use(cors());

// Body parser middleware
app.use(express.json({ limit: '50mb' }));

// FAL.ai proxy endpoint
app.post('/api/fal', async (req, res) => {
  try {
    const { images, apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }
    
    if (images.length < 2) {
      return res.status(400).json({ error: 'At least 2 images are required' });
    }
    
    console.log(`Proxying request to FAL.ai with ${images.length} images`);
    
    // Create a custom https agent with keepAlive enabled
    const httpsAgent = new https.Agent({
      keepAlive: true,
      timeout: 60000,
      rejectUnauthorized: false
    });
    
    // Using the direct API URL for the vidu model
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
      httpsAgent,
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
        message: 'DNS resolution failed. Cannot connect to FAL.ai API. Please check your internet connection or try using a VPN.'
      });
    }
    
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: true,
        message: 'Connection to FAL.ai API timed out. Please try again later or use a VPN.'
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
        message: 'No response received from FAL.ai API. Try using a VPN if your network blocks access.'
      });
    } else {
      // Something happened in setting up the request
      return res.status(500).json({
        error: true,
        message: error.message
      });
    }
  }
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle all routes by serving index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Test your application at http://localhost:${PORT}`);
}); 