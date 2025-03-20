const axios = require('axios');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { image1, image2, apiKey } = req.body;

    if (!image1 || !image2 || !apiKey) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze these two images showing a child at different ages. Focus on physical changes, emotional development, environmental constants, meaningful transition elements, and cinematic techniques that could enhance emotional impact. Create a detailed prompt for an AI video generation model to create a touching transition between these moments.'
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: image1
                }
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: image2
                }
              }
            ]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    res.status(200).json({ prompt: response.data.content[0].text });
  } catch (error) {
    console.error('Claude API Error:', error);
    const status = error.response?.status || 500;
    const message = error.response?.data?.error?.message || error.message || 'Internal server error';
    res.status(status).json({ error: message });
  }
}; 