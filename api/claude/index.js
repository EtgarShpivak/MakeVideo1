const axios = require('axios');

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image1, image2, apiKey } = req.body;

    // Validate input parameters
    if (!image1 || !image2 || !apiKey) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (!image1.data || !image2.data) {
      return res.status(400).json({ error: 'Missing image data' });
    }

    if (!apiKey.startsWith('sk-')) {
      return res.status(400).json({ error: 'Invalid Claude API key format' });
    }

    // Get base64 data without the prefix
    const getBase64Data = (imageData) => {
      if (typeof imageData !== 'string') {
        throw new Error('Invalid image data format');
      }
      return imageData.startsWith('data:image/') ? imageData.split(',')[1] : imageData;
    };

    // Process images
    let image1Base64, image2Base64;
    try {
      image1Base64 = getBase64Data(image1.data);
      image2Base64 = getBase64Data(image2.data);
    } catch (imageError) {
      console.error('Error processing images:', imageError);
      return res.status(400).json({ error: `Invalid image data: ${imageError.message}` });
    }

    // Prepare Claude API request
    const message = {
      model: "claude-3-opus-20240229",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "I have two images showing a child at different ages, and I want to create a meaningful video transition between them. Please analyze these images carefully and create a detailed, emotionally resonant prompt that captures the essence of growing up and the passage of time. Focus on:\n\n1. Physical changes (height, facial features, etc.)\n2. Emotional development visible in expressions\n3. Environmental changes or constants\n4. Meaningful transition elements that could highlight the growth journey\n5. Cinematic techniques that could enhance the emotional impact\n\nMake the prompt highly descriptive and specific, suitable for an AI video generation model to create a touching transition that captures the beauty of childhood development."
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image1.type || "image/jpeg",
                data: image1Base64
              }
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image2.type || "image/jpeg",
                data: image2Base64
              }
            }
          ]
        }
      ]
    };

    try {
      // Make request to Claude API
      const response = await axios.post(CLAUDE_API_URL, message, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'anthropic-version': '2024-01-01'
        },
        timeout: 30000,
        validateStatus: (status) => status === 200
      });

      if (!response.data?.content?.[0]?.text) {
        throw new Error('Invalid response format from Claude API');
      }

      return res.status(200).json({ prompt: response.data.content[0].text });
    } catch (apiError) {
      console.error('Claude API error:', apiError);

      if (axios.isAxiosError(apiError)) {
        const status = apiError.response?.status || 500;
        const errorMessage = apiError.response?.data?.error?.message ||
                           apiError.response?.data?.error ||
                           apiError.message ||
                           'Claude API error';

        return res.status(status).json({ error: errorMessage });
      }

      return res.status(500).json({ error: apiError.message || 'Unexpected error calling Claude API' });
    }
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 