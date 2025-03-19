import express from 'express';
import cors from 'cors';
import axios from 'axios';
import https from 'https';

const app = express();
const PORT = 3001;

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// FAL.ai proxy endpoint
app.post('/api/fal', async (req, res) => {
  try {
    const { images, apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }
    
    if (!images || images.length < 2) {
      return res.status(400).json({ error: 'At least 2 images are required' });
    }
    
    console.log(`Proxying request to FAL.ai with ${images.length} images`);
    
    // Create custom HTTPS agent with longer timeout
    const agent = new https.Agent({
      rejectUnauthorized: false,
      timeout: 60000
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
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Key ${apiKey}`,
      'Accept': 'application/json'
    };
    
    const response = await axios({
      method: 'post',
      url: falEndpoint, 
      data: payload,
      headers: headers,
      httpsAgent: agent,
      timeout: 180000, // 3 minute timeout
    });
    
    if (response.data && response.data.video_url) {
      return res.status(200).json({ 
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
    
    // Send helpful error message
    return res.status(500).json({
      error: true,
      message: error.message || 'Error connecting to FAL.ai API'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`);
}); 