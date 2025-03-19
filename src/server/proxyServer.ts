import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Proxy endpoint for FAL.ai API
app.post('/api/fal', async (req, res) => {
  try {
    const { images, apiKey } = req.body;
    
    console.log('Proxying request to FAL.ai with', images.length, 'images');
    
    const falEndpoint = 'https://gateway.fal.ai/api/v1/workflows/stable-video-diffusion';
    
    const payload = {
      input: {
        images: images,
        motion_bucket_id: 127,
        fps: 6
      }
    };
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json'
    };
    
    const response = await axios.post(falEndpoint, payload, { headers });
    
    console.log('FAL.ai response received successfully');
    
    res.json(response.data);
  } catch (error: any) {
    console.error('Proxy error with FAL.ai:', error);
    
    if (error.response) {
      res.status(error.response.status).json({
        error: true,
        message: error.response.data,
        status: error.response.status
      });
    } else {
      res.status(500).json({
        error: true,
        message: error.message
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
}); 