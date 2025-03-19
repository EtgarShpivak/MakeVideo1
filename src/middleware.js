import axios from 'axios';

export const falMiddleware = async (req, res, next) => {
  if (req.url.startsWith('/api/fal')) {
    try {
      const { apiKey, input } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ error: 'API key is required' });
      }
      
      console.log('Proxying request to FAL.ai API');
      
      const falEndpoint = 'https://gateway.fal.ai/api/v1/workflows/stable-video-diffusion';
      
      const response = await axios.post(falEndpoint, { input }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        timeout: 60000
      });
      
      return res.json(response.data);
    } catch (error) {
      console.error('Error proxying request to FAL.ai:', error);
      
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      
      return res.status(500).json({ error: error.message });
    }
  }
  
  next();
}; 