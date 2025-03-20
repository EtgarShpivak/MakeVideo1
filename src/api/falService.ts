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

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result as string;
      resolve(base64String); // Send the complete data URL
    };
    reader.onerror = error => reject(error);
  });
};

export const generatePrompt = async (image1: File, image2: File, claudeApiKey: string): Promise<string> => {
  try {
    console.log('Converting images to base64...');
    const image1Base64 = await fileToBase64(image1);
    const image2Base64 = await fileToBase64(image2);
    console.log('Images converted successfully');

    console.log('Sending request to server...');
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
      const errorMessage = response.data?.error || 'Invalid response from server';
      console.error('Server response error:', errorMessage);
      throw new Error(errorMessage);
    }

    return response.data.prompt;
  } catch (error) {
    console.error('Error in generatePrompt:', error);
    
    // Handle Axios errors
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error || error.message;
      throw new Error(errorMessage);
    }
    
    // Handle other errors
    throw error instanceof Error ? error : new Error('Failed to generate prompt');
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
      const errorMessage = response.data?.error || 'Invalid response from server';
      console.error('Server response error:', errorMessage);
      throw new Error(errorMessage);
    }

    return response.data.video_url;
  } catch (error) {
    console.error('Error generating video:', error);
    
    // Handle Axios errors
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error || error.message;
      throw new Error(errorMessage);
    }
    
    // Handle other errors
    throw error instanceof Error ? error : new Error('Failed to generate video');
  }
};

export default {
  generateVideo,
};