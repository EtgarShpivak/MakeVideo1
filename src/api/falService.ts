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

const PROXY_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://make-video1.vercel.app/api'
  : 'http://localhost:3000/api';

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

    // Call our proxy endpoint instead of Claude API directly
    const response = await axios.post(`${PROXY_BASE_URL}/claude`, {
      image1: {
        type: image1.type,
        data: image1Base64
      },
      image2: {
        type: image2.type,
        data: image2Base64
      },
      apiKey: claudeApiKey
    });

    if (!response.data || !response.data.prompt) {
      throw new Error('Invalid response from server');
    }

    return response.data.prompt;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(`Server error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error('No response received from server. Please check your internet connection.');
      }
    }
    throw error instanceof Error ? error : new Error('Failed to generate prompt from images');
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

    // Call our proxy endpoint instead of FAL.ai API directly
    const response = await axios.post(`${PROXY_BASE_URL}/fal`, {
      image1: image1Base64,
      image2: image2Base64,
      prompt,
      apiKey,
      model: 'kling-1.6',
      duration: 4,
      aspect_ratio: '16:9'
    });

    if (!response.data || !response.data.video_url) {
      throw new Error('Invalid response from server');
    }

    return response.data.video_url;
  } catch (error) {
    console.error('Error generating video:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Server error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
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