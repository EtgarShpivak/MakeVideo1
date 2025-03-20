import axios from 'axios';

interface VideoGenerationParams {
  images: string[];
  apiKey: string;
  prompt?: string;
  negativePrompt?: string;
  duration?: number;
  aspectRatio?: string;
}

interface VideoResponse {
  videoUrl: string;
  status: string;
}

interface GenerateVideoOptions {
  testMode?: boolean;
  retryOnFailure?: boolean;
  prompt?: string;
  negativePrompt?: string;
  duration?: number;
  aspectRatio?: string;
}

// FAL.ai API service
const MAX_RETRIES = 2;
const RETRY_DELAY = 3000; // 3 seconds

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const FAL_API_URL = 'https://api.fal.ai/v1/video-generation';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

interface ClaudeMessage {
  model: string;
  max_tokens: number;
  messages: {
    role: string;
    content: {
      type: string;
      text?: string;
      source?: {
        type: string;
        media_type: string;
        data: string;
      };
    }[];
  }[];
}

interface FalRequest {
  image1: string;
  image2: string;
  prompt: string;
  model: string;
  duration: number;
  aspect_ratio: string;
}

export const generatePrompt = async (image1: File, image2: File, claudeApiKey: string): Promise<string> => {
  try {
    // Convert images to base64
    const image1Base64 = await fileToBase64(image1);
    const image2Base64 = await fileToBase64(image2);

    // Prepare the message for Claude
    const message: ClaudeMessage = {
      model: "claude-3-opus-20240229",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "I have two images that I want to create a video transition between. Please analyze these images and create a detailed prompt that describes how the video should transition from the first image to the second. The prompt should be descriptive and focus on the visual elements, movement, and style of the transition. Make it suitable for an AI video generation model."
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image1.type,
                data: image1Base64
              }
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image2.type,
                data: image2Base64
              }
            }
          ]
        }
      ]
    };

    // Call Claude API
    const response = await axios.post(CLAUDE_API_URL, message, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      }
    });

    return response.data.content[0].text;
  } catch (error) {
    console.error('Error generating prompt:', error);
    throw new Error('Failed to generate prompt from images');
  }
};

export const generateVideo = async (
  image1: File,
  image2: File,
  prompt: string,
  apiKey: string,
  testMode: boolean = false
): Promise<string> => {
  try {
    // Convert images to base64
    const image1Base64 = await fileToBase64(image1);
    const image2Base64 = await fileToBase64(image2);

    if (testMode) {
      return 'https://example.com/test-video.mp4';
    }

    const requestData: FalRequest = {
      image1: image1Base64,
      image2: image2Base64,
      prompt,
      model: 'kling-1.6',
      duration: 4,
      aspect_ratio: '16:9'
    };

    const response = await axios.post(
      FAL_API_URL,
      requestData,
      {
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.video_url;
  } catch (error) {
    console.error('Error generating video:', error);
    throw new Error('Failed to generate video');
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      resolve(base64String.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
};

export default {
  generateVideo,
};