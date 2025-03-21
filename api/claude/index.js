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

    // Create a custom axios instance with increased timeout
    const client = axios.create({
      timeout: 60000, // 60 seconds
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    const response = await client.post(
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
                text: 'These are personal family photos of my child at different ages. I want to create a meaningful video transition between these moments to capture their growth and development as a cherished family keepsake. Please analyze these images and create a detailed prompt that focuses on:\n\n1. The physical changes and growth visible between the images\n2. The emotional development and personality shown in their expressions\n3. Any meaningful constants in their environment or appearance\n4. Suggestions for gentle, respectful transition elements that highlight their journey\n5. Cinematic techniques that could make this a touching family memory\n\nPlease create a detailed prompt for an AI video generation model that will help create a beautiful transition between these precious moments.'
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

    if (!response.data?.content?.[0]?.text) {
      throw new Error('Invalid response from Claude API');
    }

    res.status(200).json({ prompt: response.data.content[0].text });
  } catch (error) {
    console.error('Claude API Error:', error);
    const status = error.response?.status || 500;
    const message = error.response?.data?.error?.message || error.message || 'Internal server error';
    res.status(status).json({ error: message });
  }
}; 