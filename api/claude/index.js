import axios from 'axios';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

export default async function handler(req, res) {
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
    console.log('[DEBUG] Received request to generate prompt');
    
    const { image1, image2, apiKey } = req.body;

    if (!image1 || !image2 || !apiKey) {
      console.log('[ERROR] Missing required parameters');
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Log request data (safely)
    console.log('[DEBUG] Image 1 type:', image1.type);
    console.log('[DEBUG] Image 2 type:', image2.type);
    console.log('[DEBUG] API key present:', !!apiKey);

    // Validate image data
    if (!image1.data || !image2.data) {
      return res.status(400).json({ error: 'Image data is missing' });
    }

    // Get base64 data without the prefix
    const getBase64Data = (imageData) => {
      if (imageData.startsWith('data:image/')) {
        return imageData.split(',')[1];
      }
      return imageData;
    };

    const image1Base64 = getBase64Data(image1.data);
    const image2Base64 = getBase64Data(image2.data);

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

    console.log('[DEBUG] Sending request to Claude API');
    const response = await axios.post(CLAUDE_API_URL, message, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2024-01-01'
      },
      timeout: 30000
    });

    console.log('[DEBUG] Received response from Claude API');
    
    if (!response.data?.content?.[0]?.text) {
      console.error('[ERROR] Invalid response structure from Claude API:', JSON.stringify(response.data));
      return res.status(500).json({ error: 'Invalid response from Claude API' });
    }

    return res.status(200).json({ prompt: response.data.content[0].text });

  } catch (error) {
    console.error('[ERROR] Claude API error:', error.message);
    
    // Handle Axios errors
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const statusCode = error.response.status;
        const errorMessage = error.response.data?.error?.message || error.response.data?.error || error.message;
        console.error(`[ERROR] API responded with status ${statusCode}:`, errorMessage);
        return res.status(statusCode).json({ error: errorMessage });
      } else if (error.request) {
        console.error('[ERROR] No response received from Claude API');
        return res.status(503).json({ error: 'No response received from Claude API' });
      }
    }

    // Handle other errors
    console.error('[ERROR] Unexpected error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
} 