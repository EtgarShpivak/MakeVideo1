import axios from 'axios';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image1, image2, apiKey } = req.body;

    if (!image1 || !image2 || !apiKey) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

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
                media_type: image1.type,
                data: image1.data
              }
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image2.type,
                data: image2.data
              }
            }
          ]
        }
      ]
    };

    const response = await axios.post(CLAUDE_API_URL, message, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2024-01-01'
      },
      timeout: 30000
    });

    if (!response.data?.content?.[0]?.text) {
      throw new Error('Invalid response from Claude API');
    }

    res.status(200).json({ prompt: response.data.content[0].text });
  } catch (error) {
    console.error('Claude API error:', error);
    res.status(500).json({ 
      error: error.response?.data?.error || error.message || 'Internal server error'
    });
  }
} 